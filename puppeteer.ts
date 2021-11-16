import _ from 'lodash';
import puppeteer from 'puppeteer';
import { Credentials, VaccineField, VaccineInfo } from './@types';
import config from './config';
import { generateUrl, getRandomCredential, readExisting, saveRecords } from './utils';

async function getBrowser(): Promise<puppeteer.Browser> {
    const browser = await puppeteer.launch();
    return browser;
}

async function loginCurrentPage(page: puppeteer.Page, creds: Credentials) {
    await page.type('#username', creds.username);
    await page.type('#password', creds.password);
    await page.click('input[name="remember_password"]');
    await page.click('#submitLogin1');
    try {
        await page.waitForNavigation({ timeout: 10000 });
    } catch (e) {
        // do nothing
    }
    return page;
}

export function getTextBySelector(document: Document, selector: VaccineField, prefix = '#'): string {
    const element = document.querySelector(`${prefix}${selector}`);
    return element ? element.textContent || '' : '';
}

async function getTextFromPage(page: puppeteer.Page, selector: string): Promise<string> {
    return await page.$eval(selector, element => element?.innerHTML);
}

async function parseVaxInfo(vaxId: number, page: puppeteer.Page): Promise<VaccineInfo> {
    try {
        await page.waitForSelector('#view1_fname', { timeout: config.PUPPETEER_DOM_TIMEOUT });
        return {
            vaxId: vaxId.toString(),
            firstName: await getTextFromPage(page, '#view1_fname'),
            lastName: await getTextFromPage(page, '#view1_lname'),
            middleName: await getTextFromPage(page, '#view1_mi'),
            firstDoseAt: await getTextFromPage(page, '#view1_datevaccination'),
            secondDoseAt: await getTextFromPage(page, '#view1_datevaccination2'),
            vaccineBrand: await getTextFromPage(page, '#view1_Brand'),
        };
    } catch (e) {
        return {
            vaxId: vaxId.toString(),
            firstName: '',
            lastName: '',
            middleName: '',
            firstDoseAt: '',
            secondDoseAt: '',
            vaccineBrand: '',
        }
    }
}

async function clearCookies(page: puppeteer.Page) {
    const client = await page.target().createCDPSession()
    await client.send('Network.clearBrowserCookies')
}

async function main() {
    let existing = (await readExisting()).filter(e => !config.REFETCH_EMPTY || e.firstName);
    let existingVaxIds = existing.map(e => e.vaxId);

    let current = config.STARTING_VACCINE_ID;
    if (existing.length > 0 && config.RESUME_FROM_LAST_RECORDED) {
        current = parseInt(existingVaxIds[existingVaxIds.length - 1], 10);
    }

    const browser = await getBrowser();
    let puppet = await browser.newPage();

    while (true) {
        try {
            const currentExistsAndEmpty = _.some(existing, e => e.vaxId === current.toString() && !e.firstName);
            const shouldRefetch = config.REFETCH_EMPTY && currentExistsAndEmpty;

            if (existingVaxIds.includes(current.toString()) && !shouldRefetch) {
                console.log(`Skipping ${current}: already exists`);
            } else {
                console.log(`Processing vaxId ${current}`);

                if (current % config.PUPPETEER_ROTATE_CREDENTIALS_INTERVAL === 0) {
                    await clearCookies(puppet);
                }

                await puppet.goto(generateUrl(current), { waitUntil: 'domcontentloaded' });
                if (await puppet.$('#username')) {
                    await loginCurrentPage(puppet, getRandomCredential(existing));
                }

                const info = await parseVaxInfo(current, puppet)
                if (info.firstName) {
                    console.log(`Saving record for #${current}: ${info.firstName} ${info.lastName}`);
                } else {
                    console.log(`No info found for ${current}`);
                }

                await saveRecords([info], true);
                existingVaxIds.push(current.toString());
            }

            current += 1;
        } catch (e) {
            console.error(e);
            if (config.PUPPETEER_IGNORE_ERRORS) {
                console.log('Retrying after sleep...');
                await new Promise(resolve => setTimeout(resolve, config.PUPPETEER_SLEEP_ON_ERROR));
            } else {
                await puppet.close();
                await browser.close();
                process.exit();
            }
        }
    }
}

main();