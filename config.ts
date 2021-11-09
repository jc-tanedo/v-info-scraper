export default {
    STARTING_VACCINE_ID: 1,
    CONCURRENT: 8,
    CONSECUTIVE_EMPTY_BATCHES_BEFORE_CHECK_ALIVE: 4,
    RESUME_FROM_LAST_RECORDED: true,
    FILE_NAME: 'results.csv',
    REQUEST_CLIENT: 'superagent',
    VAX_INFO_URL: 'http://119.92.115.50:82/vimsp/patient_detail_view.php',
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
};
