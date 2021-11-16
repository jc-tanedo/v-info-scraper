export declare interface VaccineInfo {
    vaxId: string;
    firstName?: string;
    lastName?: string;
    middleName?: string;
    firstDoseAt?: string;
    secondDoseAt?: string;
    vaccineBrand?: string;
}

export declare interface Credentials {
    username: string;
    password: string;
}

export declare type VaccineField = 'view1_fname'
    | 'view1_mi'
    | 'view1_lname'
    | 'view1_Brand'
    | 'view1_datevaccination'
    | 'view1_datevaccination2'
    | 'view1_Lotno'
    | 'view1_lotno2'
    ;
