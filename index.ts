import axios from 'axios';
import { JSDOM } from 'jsdom';
import _ from 'lodash';
import superagent from 'superagent';
import { Credentials, VaccineInfo } from './@types/index.d';
import config from './config';
import { generateUrl, getRandomCredential, parseVaxInfo, range, readExisting, saveRecords } from './utils';

async function auth(username: string, password: string): Promise<any> {
    try {
        const response = await axios.post(config.LOGIN_URL, {
            'btnSubmit': 'Login',
            username,
            password,
        });

        const loginCookiePair = _.chain(response.headers)
            .get('set-cookie.0')
            .split(';')
            .first()
            .split('=')
            .value();

        return _.fromPairs([loginCookiePair]);
    } catch (e) {
        console.error(e);
        process.exit();
    }
}

async function doRequest(vaxId: number, creds: Credentials): Promise<string> {
    let response, htmlText;
    const cookie = await auth(creds.username, creds.password);

    switch (config.REQUEST_CLIENT) {
        case 'axios':
            response = await axios.get(generateUrl(vaxId), {
                headers: {
                    'Host': 'pampanga.gov.ph:82',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:94.0) Gecko/20100101 Firefox/94.0',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
                    'Accept-Language': 'en-US,en;q=0.5',
                    'Accept-Encoding': 'gzip, deflate',
                    'Proxy-Authorization': 'Basic enRxZHI4aGMtcnBxdnRlYzpwM3h6NGgyeXdm',
                    'Connection': 'keep-alive',
                    'Cookie': `mediaType=0; gJhyaqwdIlSfbufTXyqc=${cookie.gJhyaqwdIlSfbufTXyqc}`,
                    'Cache-Control': 'max-age=0',
                }
            });
            htmlText = response.data;
            break;
        default:
            response = await superagent(generateUrl(vaxId));
            htmlText = response.text;
    }

    return htmlText;
}

async function fetchVaxInfo(vaxId: number, timeout = config.FETCH_TIMEOUT, creds: Credentials): Promise<VaccineInfo> {
    const domStringPromise = doRequest(vaxId, creds);
    const domString = await Promise.race([
        domStringPromise,
        new Promise(resolve => setTimeout(() => resolve(''), timeout)),
    ]) as string;

    return parseVaxInfo(vaxId, new JSDOM(domString));
}

async function fetchAndSave(current: number, existingVaxIds: string[], batchWorker = false, creds: Credentials): Promise<VaccineInfo | null> {
    !batchWorker && console.log(`Processing vaxId ${current}`);
    if (existingVaxIds.includes(current.toString())) {
        !batchWorker && console.log(`vaxId ${current} already exists`);
        return null;
    }

    try {
        const result = await fetchVaxInfo(current, undefined, creds);
        if (batchWorker) {
            return result;
        }

        console.log(`Writing info for vaxId ${current}: ${result.firstName} ${result.lastName}`);
        await saveRecords([result], existingVaxIds.length > 0);
        console.log('Success!\n\n');

        return null;
    } catch (e) {
        console.log(`Processing for vaxId ${current} failed`);
        console.error(e);
        process.exit();
    } finally {
        return null;
    }
}

async function checkAlive(): Promise<boolean> {
    console.log('Too many empty sets, checking if server is reachable');
    const creds = await auth('ROMEO', 'ALCANTARA');
    const firstV = await fetchVaxInfo(1, config.CHECKALIVE_TIMEOUT, creds);
    if (firstV.firstName) {
        console.log('All good!');
    }
    return Boolean(firstV.firstName);
}

async function main() {
    let existing = (await readExisting()).filter(e => !config.REFETCH_EMPTY || e.firstName);
    let existingVaxIds = existing.map(e => e.vaxId);

    let current = config.STARTING_VACCINE_ID;
    if (existing.length > 0 && config.RESUME_FROM_LAST_RECORDED) {
        current = parseInt(existingVaxIds[existingVaxIds.length - 1], 10);
    }

    let emptyCounter = 1;
    while (true) {
        if (config.CONCURRENT === 1) {
            const creds = getRandomCredential(existing);
            fetchAndSave(current, existingVaxIds, false, creds);
            current += 1;
        } else {
            try {
                const currentBatch = range(current, current + config.CONCURRENT);
                console.log(`Processing vaxId batch ${currentBatch[0]} - ${currentBatch[currentBatch.length - 1]}`);
                if (_.every(currentBatch, c => existingVaxIds.includes(c.toString()))) {
                    console.log(`All items in vaxId batch ${currentBatch[0]} - ${currentBatch[currentBatch.length - 1]} already exist`);
                    current += config.CONCURRENT;
                    continue;
                }

                const creds = getRandomCredential(existing);
                const results = await Promise.all(currentBatch.map(c => existingVaxIds.includes(c.toString()) ? Promise.resolve(null) : fetchVaxInfo(c, undefined, creds)));
                const filteredResults = results.filter(v => !!v && (config.SAVE_EMPTY || v.firstName)) as VaccineInfo[];

                if (filteredResults.length > 0) {
                    console.log(`Writing info for vaxId batch ${currentBatch[0]} - ${currentBatch[currentBatch.length - 1]}`);
                    if (config.APPEND) {
                        await saveRecords(filteredResults, existingVaxIds.length > 0);
                    } else {
                        existing.push(...filteredResults);
                        existing = _.uniqBy(existing, 'vaxId');
                        existing = _.orderBy(existing, e => parseInt(e.vaxId, 10));
                        existingVaxIds = _.map(existing, 'vaxId');
                        await saveRecords(existing, false);
                    }
                    console.log('Success!\n\n');

                    if (_.some(filteredResults, r => r.firstName)) {
                        current += config.CONCURRENT;
                        continue;
                    }
                }

                if (emptyCounter < config.CONSECUTIVE_EMPTY_BATCHES_BEFORE_CHECK_ALIVE) {
                    emptyCounter += 1;
                    current += config.CONCURRENT;
                    continue;
                }

                emptyCounter = 1;

                if (await checkAlive()) {
                    current += config.CONCURRENT;
                } else {
                    const rollbackCount = config.CONSECUTIVE_EMPTY_BATCHES_BEFORE_CHECK_ALIVE * config.CONCURRENT
                    current -= rollbackCount - config.CONCURRENT;
                    await new Promise(resolve => {
                        console.log(`Server seems down, sleeping and retrying last ${rollbackCount} items...`);
                        setTimeout(resolve, 60_000);
                    });
                }
            } catch (e) {
                console.error(e);
                process.exit();
            }
        }
    }
}

main();
