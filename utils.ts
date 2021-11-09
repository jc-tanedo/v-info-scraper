import { createObjectCsvWriter } from 'csv-writer';
import { JSDOM } from 'jsdom';
import { VaccineField, VaccineInfo } from './@types';
import config from './config';

const { FILE_NAME, FIELDS, VAX_INFO_URL } = config;
const FILE_PATH = `${__dirname}/${FILE_NAME}`;

export const csvWriter = createObjectCsvWriter({
    path: FILE_PATH,
    header: FIELDS,
    append: true,
});

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
