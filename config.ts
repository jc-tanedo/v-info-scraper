import _ from 'lodash';
import minimist from 'minimist';

let args = minimist(process.argv.slice(2)) as Record<string, any>;
args = _.mapKeys(args, (v, k) => _.upperCase(_.snakeCase(k)));

export default {
    STARTING_VACCINE_ID: 1,
    CONCURRENT: 2,
    CONSECUTIVE_EMPTY_BATCHES_BEFORE_CHECK_ALIVE: 4,
    RESUME_FROM_LAST_RECORDED: false,
    FILE_NAME: 'results.csv',
    REQUEST_CLIENT: 'axios',
    VAX_INFO_URL: 'http://pampanga.gov.ph:82/vimsp/patient_detail_view.php',
    LOGIN_URL: 'http://pampanga.gov.ph:82/vimsp/login.php',
    FIELDS: [
        { id: 'vaxId', title: 'vaxId' },
        { id: 'firstName', title: 'firstName' },
        { id: 'middleName', title: 'middleName' },
        { id: 'lastName', title: 'lastName' },
        { id: 'firstDoseAt', title: 'firstDoseAt' },
        { id: 'secondDoseAt', title: 'secondDoseAt' },
        { id: 'vaccineBrand', title: 'vaccineBrand' },
    ],
    DRYRUN: false,
    FETCH_TIMEOUT: 2000,
    CHECKALIVE_TIMEOUT: 10000,
    APPEND: false,
    SAVE_EMPTY: true,
    REFETCH_EMPTY: false,

    PUPPETEER_IGNORE_ERRORS: true,
    PUPPETEER_ROTATE_CREDENTIALS_INTERVAL: 10,
    PUPPETEER_SLEEP_ON_ERROR: 10 * 60 * 1000,
    PUPPETEER_DOM_TIMEOUT: 200,

    ...args,
};
