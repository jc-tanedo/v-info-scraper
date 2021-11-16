import parse from 'csv-parse/lib/sync';
import { createObjectCsvWriter } from 'csv-writer';
import { promises as fs } from 'fs';
import { JSDOM } from 'jsdom';
import _ from 'lodash';
import { Credentials, VaccineField, VaccineInfo } from './@types';
import config from './config';

const { FILE_NAME, FIELDS, VAX_INFO_URL } = config;
const FILE_PATH = `${__dirname}/${FILE_NAME}`;

export const csvWriter = createObjectCsvWriter({
    path: FILE_PATH,
    header: FIELDS,
    append: true,
});

export function getRandomCredential(records: VaccineInfo[]): Credentials {
    const sample = _.sample(records);
    if (sample?.firstName && sample?.lastName) {
        return {
            username: sample.firstName,
            password: sample.lastName,
        };
    }

    return getRandomCredential(records);
}

export async function saveRecords(records: VaccineInfo[], append = true) {
    if (config.DRYRUN) {
        console.log('[DRY RUN]: Saving the following', records);
        return;
    }

    if (append) {
        await csvWriter.writeRecords(records);
    } else {
        const newWriter = getNewWriter(false);
        await newWriter.writeRecords(records);
    }
}

export const csvWriterNew = createObjectCsvWriter({
    path: FILE_PATH,
    header: FIELDS,
    append: false,
});

export const getNewWriter = (append = true) => createObjectCsvWriter({
    path: FILE_PATH,
    header: FIELDS,
    append,
});

export async function readExisting(): Promise<VaccineInfo[]> {
    let records;
    try {
        const fileContent = await fs.readFile(FILE_PATH);
        records = parse(fileContent, { columns: true });
    } catch (e) {
        if (e instanceof Error && 'code' in e && (e as { code: string; }).code === 'ENOENT') {
            records = [];
        } else {
            console.error(e);
            process.exit(1);
        }
    } finally {
        return records;
    }
}

export function getTextBySelector(dom: JSDOM, selector: VaccineField, prefix = '#'): string {
    const element = dom.window.document.querySelector(`${prefix}${selector}`);
    return element ? element.textContent || '' : '';
}

export function generateUrl(vaxId: number): string {
    return `${VAX_INFO_URL}?editid1=${vaxId.toString().padStart(7, '0')}`;
}

export function parseVaxInfo(vaxId: number, dom: JSDOM): VaccineInfo {
    return {
        vaxId: vaxId.toString(),
        firstName: getTextBySelector(dom, 'view1_fname'),
        lastName: getTextBySelector(dom, 'view1_lname'),
        middleName: getTextBySelector(dom, 'view1_mi'),
        firstDoseAt: getTextBySelector(dom, 'view1_datevaccination'),
        secondDoseAt: getTextBySelector(dom, 'view1_datevaccination2'),
        vaccineBrand: getTextBySelector(dom, 'view1_Brand'),
    };
}

export const range = (start: number, end = 0): number[] => {
    const length = end > start ? end - start : start;
    const floor = end > start ? start : 0;
    return Array.from({ length }, (_, i) => floor + i);
}


export default {
    csvWriter,
    csvWriterNew,
    getNewWriter,
    getTextBySelector,
    generateUrl,
    parseVaxInfo,
    range,
};
