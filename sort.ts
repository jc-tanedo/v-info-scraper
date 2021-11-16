import _ from 'lodash';
import { readExisting, saveRecords } from './utils';

async function main() {
    let existing = await readExisting();

    const sorted = _.orderBy(existing, r => parseInt(r.vaxId, 10));
    saveRecords(sorted, false);
}

main();
