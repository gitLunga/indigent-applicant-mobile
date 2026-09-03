/**
 * The application's shape and rules.
 *
 * Field names, enum values and validation are taken from `prisma/schema.prisma`
 * and the web client's `Apply.jsx`. They are reproduced rather than invented: if
 * this file and the schema ever disagree, the schema is right and this is a bug.
 *
 * Nothing here decides anything. Eligibility, the means test, the disability
 * identifier, the date of birth and the composed postal address are all computed
 * by the server, and the app never sends them.
 */

// ---------------------------------------------------------------------------
// Enums — exact values the API accepts
// ---------------------------------------------------------------------------

export const MARITAL_STATUS = [
  { value: 'SINGLE', label: 'Single' },
  { value: 'MARRIED', label: 'Married' },
  { value: 'DIVORCED', label: 'Divorced' },
  { value: 'WIDOWED', label: 'Widowed' },
  { value: 'SEPARATED', label: 'Separated' },
] as const;

/**
 * Employment, worded as an answer to "Are you employed?".
 *
 * The values are the API's; only the labels change, because the question is now
 * asked before the employer details rather than after them.
 */
export const EMPLOYMENT_STATUS = [
  { value: 'EMPLOYED', label: 'Yes, I am employed' },
  { value: 'SELF_EMPLOYED', label: 'I work for myself' },
  { value: 'UNEMPLOYED', label: 'No, I am unemployed' },
  { value: 'PENSIONER', label: 'No, I am a pensioner' },
  { value: 'OTHER', label: 'Something else' },
] as const;

/** The only answers for which an employer exists. */
export const EMPLOYER_DETAILS_NEEDED = ['EMPLOYED', 'SELF_EMPLOYED'];

export const TENURE = [
  { value: 'OWNER', label: 'I own this property' },
  { value: 'TENANT', label: 'I rent this property' },
  { value: 'OCCUPIER', label: 'I live here but do not own or rent it' },
] as const;

export const APPLICANT_CATEGORY = [
  { value: 'STANDARD', label: 'None of these' },
  { value: 'PENSIONER', label: 'Pensioner household' },
  { value: 'DECEASED_ESTATE', label: 'The owner has died' },
  { value: 'CHILD_HEADED', label: 'Child-headed household' },
  { value: 'DISABLED', label: 'Household headed by a person with a disability' },
] as const;

export const SEX = [
  { value: 'FEMALE', label: 'Female' },
  { value: 'MALE', label: 'Male' },
] as const;

/** Offered as suggestions. The field accepts anything typed. */
export const TITLES = ['Mr', 'Mrs', 'Ms', 'Miss', 'Dr', 'Prof', 'Rev', 'Adv', 'Nkosi', 'Nkosikazi'];

/** The Washington Group four-point scale, used verbatim. */
export const DIFFICULTY = [
  { value: 'NO_DIFFICULTY', label: 'No difficulty' },
  { value: 'SOME_DIFFICULTY', label: 'Some difficulty' },
  { value: 'A_LOT_OF_DIFFICULTY', label: 'A lot of difficulty' },
  { value: 'CANNOT_DO_AT_ALL', label: 'Cannot do at all' },
] as const;

/**
 * The six functioning domains.
 *
 * Wording is the Stats SA census instrument, unchanged. Rephrasing it would make
 * the municipality's figures incomparable with the census, which is most of the
 * reason for asking.
 */
export const FUNCTIONING_DOMAINS = [
  { field: 'difficultySeeing', question: 'Do you have difficulty seeing, even if wearing glasses?' },
  { field: 'difficultyHearing', question: 'Do you have difficulty hearing, even if using a hearing aid?' },
  { field: 'difficultyWalking', question: 'Do you have difficulty walking or climbing steps?' },
  { field: 'difficultyRemembering', question: 'Do you have difficulty remembering or concentrating?' },
  { field: 'difficultySelfCare', question: 'Do you have difficulty with self-care, such as washing all over or dressing?' },
  { field: 'difficultyCommunicating', question: 'Do you have difficulty communicating, for example understanding or being understood?' },
] as const;

// ---------------------------------------------------------------------------
// The form
// ---------------------------------------------------------------------------

export type ApplicationForm = {
  // Applicant particulars
  title: string;
  surname: string;
  fullName: string;
  idNumber: string;
  sex: string;
  /** Local only, never sent: stops the ID number overwriting a chosen answer. */
  sexTouched: boolean;
  maritalStatus: string;
  cellNumber: string;

  residentialAddress: string;
  addressLatitude: string;
  addressLongitude: string;
  addressFormatted: string;
  addressSource: string;
  addressAccuracyM: string;

  postalSameAsResidential: boolean;
  postalLine1: string;
  postalLine2: string;
  postalSuburb: string;
  postalCity: string;
  postalCode: string;

  employmentStatus: string;
  employerName: string;
  employerAddress: string;
  workTelNumber: string;

  // Property
  tenure: string;
  ownerFullName: string;
  ownerIdNumber: string;
  ownerRelationship: string;
  ownerDeceased: boolean | null;
  applicantCategory: string;
  wardNumber: string;
  municipalAccountNumber: string;
  eskomAccountNumber: string;
  waterMeterNumber: string;
  electricityMeterNumber: string;
  ownsOtherProperty: boolean | null;
  otherPropertyDetails: string;

  // Household and income
  peopleOnProperty: string;
  childrenUnder18: string;
  adults: string;
  pensionersOver60: string;
  salary: string;
  oldAgePension: string;
  disabilityPension: string;
  businessIncome: string;
  rentingIncome: string;
  incomeExclusions: string;

  // General information
  ownsImmovableProperty: boolean | null;
  isFullTimeOccupant: boolean | null;
  hasMunicipalArrears: boolean | null;
  hasArrearsArrangement: boolean | null;
  consentSiteVisit: boolean;
  consentDataMatching: boolean;
  declarationTruthful: boolean;

  // Functioning
  difficultySeeing: string;
  difficultyHearing: string;
  difficultyWalking: string;
  difficultyRemembering: string;
  difficultySelfCare: string;
  difficultyCommunicating: string;
};

/**
 * Enum fields start blank on purpose.
 *
 * Defaulting `employmentStatus` to EMPLOYED, or a functioning question to "no
 * difficulty", would record an answer the applicant never gave — and on the
 * functioning questions that is health information nobody consented to.
 */
export const emptyForm: ApplicationForm = {
  title: '', surname: '', fullName: '', idNumber: '', sex: '', sexTouched: false,
  maritalStatus: '', cellNumber: '',
  residentialAddress: '', addressLatitude: '', addressLongitude: '',
  addressFormatted: '', addressSource: '', addressAccuracyM: '',
  postalSameAsResidential: false, postalLine1: '', postalLine2: '',
  postalSuburb: '', postalCity: '', postalCode: '',
  employmentStatus: '', employerName: '', employerAddress: '', workTelNumber: '',
  tenure: '', ownerFullName: '', ownerIdNumber: '', ownerRelationship: '', ownerDeceased: null,
  applicantCategory: 'STANDARD', wardNumber: '',
  municipalAccountNumber: '', eskomAccountNumber: '',
  waterMeterNumber: '', electricityMeterNumber: '',
  ownsOtherProperty: null, otherPropertyDetails: '',
  peopleOnProperty: '', childrenUnder18: '', adults: '', pensionersOver60: '',
  salary: '', oldAgePension: '', disabilityPension: '', businessIncome: '',
  rentingIncome: '', incomeExclusions: '',
  ownsImmovableProperty: null, isFullTimeOccupant: null,
  hasMunicipalArrears: null, hasArrearsArrangement: null,
  consentSiteVisit: false, consentDataMatching: false, declarationTruthful: false,
  difficultySeeing: '', difficultyHearing: '', difficultyWalking: '',
  difficultyRemembering: '', difficultySelfCare: '', difficultyCommunicating: '',
};

/** Fill the form from an application the API returned. */
export function formFromApplication(a: Record<string, any>): ApplicationForm {
  const str = (v: unknown) => (v === null || v === undefined ? '' : String(v));
  const bool = (v: unknown) => (v === true || v === false ? v : null);

  return {
    ...emptyForm,
    title: str(a.title),
    surname: str(a.surname),
    // Falls back to the old field for drafts written before the migration, so
    // nobody opens their application to find their name gone.
    fullName: str(a.fullName) || str(a.names),
    idNumber: str(a.idNumber),
    // Falls back to the ID number for drafts started before sex was asked
    // explicitly, so an old draft opens with the field already answered.
    sex: str(a.sex) || sexFromIdNumber(str(a.idNumber)),
    // A stored answer counts as chosen, so correcting the ID later does not
    // quietly overwrite it.
    sexTouched: Boolean(a.sex),
    maritalStatus: str(a.maritalStatus),
    cellNumber: str(a.cellNumber),

    residentialAddress: str(a.residentialAddress),
    addressLatitude: str(a.addressLatitude),
    addressLongitude: str(a.addressLongitude),
    addressFormatted: str(a.addressFormatted),
    addressSource: str(a.addressSource),
    addressAccuracyM: str(a.addressAccuracyM),

    postalSameAsResidential: Boolean(a.postalSameAsResidential),
    postalLine1: str(a.postalLine1),
    postalLine2: str(a.postalLine2),
    postalSuburb: str(a.postalSuburb),
    postalCity: str(a.postalCity),
    postalCode: str(a.postalCode),

    employmentStatus: str(a.employmentStatus),
    employerName: str(a.employerName),
    employerAddress: str(a.employerAddress),
    workTelNumber: str(a.workTelNumber),

    tenure: str(a.tenure),
    ownerFullName: str(a.ownerFullName),
    ownerIdNumber: str(a.ownerIdNumber),
    ownerRelationship: str(a.ownerRelationship),
    ownerDeceased: bool(a.ownerDeceased),
    applicantCategory: str(a.applicantCategory) || 'STANDARD',
    wardNumber: str(a.wardNumber),
    municipalAccountNumber: str(a.municipalAccountNumber),
    eskomAccountNumber: str(a.eskomAccountNumber),
    waterMeterNumber: str(a.waterMeterNumber),
    electricityMeterNumber: str(a.electricityMeterNumber),
    ownsOtherProperty: bool(a.ownsOtherProperty),
    otherPropertyDetails: str(a.otherPropertyDetails),

    peopleOnProperty: str(a.peopleOnProperty),
    childrenUnder18: str(a.childrenUnder18),
    adults: str(a.adults),
    pensionersOver60: str(a.pensionersOver60),
    salary: str(a.salary),
    oldAgePension: str(a.oldAgePension),
    disabilityPension: str(a.disabilityPension),
    businessIncome: str(a.businessIncome),
    rentingIncome: str(a.rentingIncome),
    incomeExclusions: str(a.incomeExclusions),

    ownsImmovableProperty: bool(a.ownsImmovableProperty),
    isFullTimeOccupant: bool(a.isFullTimeOccupant),
    hasMunicipalArrears: bool(a.hasMunicipalArrears),
    hasArrearsArrangement: bool(a.hasArrearsArrangement),
    consentSiteVisit: Boolean(a.consentSiteVisit),
    consentDataMatching: Boolean(a.consentDataMatching),
    declarationTruthful: Boolean(a.declarationTruthful),

    difficultySeeing: str(a.difficultySeeing),
    difficultyHearing: str(a.difficultyHearing),
    difficultyWalking: str(a.difficultyWalking),
    difficultyRemembering: str(a.difficultyRemembering),
    difficultySelfCare: str(a.difficultySelfCare),
    difficultyCommunicating: str(a.difficultyCommunicating),
  };
}

// ---------------------------------------------------------------------------
// Derived identity
// ---------------------------------------------------------------------------

/**
 * Sex as recorded in the ID number: sequence digits 0000–4999 is female.
 *
 * Shown as a default the applicant can change. The server derives it too, and an
 * explicit answer wins there — so this is a convenience, never the truth.
 */
/**
 * Initials from whatever given names were typed.
 *
 * Mirrors src/lib/names.js on the server. Derived rather than asked for, so the
 * two can never disagree. A hyphenated name gives an initial per part, as it is
 * written on an identity document, and the first *letter* is taken rather than
 * the first character — people bracket a preferred name, and "Nomsa (Thandiwe)"
 * should still give N.T.
 */
export function initialsOf(fullName: string): string {
  return String(fullName || '')
    .trim()
    .split(/\s+/)
    .flatMap((part) => part.split('-'))
    .map((part) => [...part].find((ch) => /\p{L}/u.test(ch)))
    .filter(Boolean)
    .map((ch) => `${(ch as string).toUpperCase()}.`)
    .join('');
}

export function sexFromIdNumber(idNumber: string): string {
  const digits = String(idNumber || '').replace(/\D/g, '');
  if (digits.length !== 13) return '';
  return Number(digits.slice(6, 10)) < 5000 ? 'FEMALE' : 'MALE';
}

/**
 * Date of birth and age, read back from the ID number for display only.
 *
 * Never sent. The server recomputes both from the same digits, and a second
 * answer travelling in the request would only give the two a chance to disagree.
 * The century is inferred the way Home Affairs numbers work: a year that would
 * put somebody in the future belongs to the previous century.
 */
export function identityFromIdNumber(idNumber: string): { dateOfBirth: string; age: number } | null {
  const digits = String(idNumber || '').replace(/\D/g, '');
  if (digits.length !== 13) return null;

  const yy = Number(digits.slice(0, 2));
  const mm = Number(digits.slice(2, 4));
  const dd = Number(digits.slice(4, 6));
  if (mm < 1 || mm > 12 || dd < 1 || dd > 31) return null;

  const now = new Date();
  const currentYear = now.getFullYear();
  let year = 1900 + yy;
  if (year + 100 <= currentYear) year += 100;

  const born = new Date(Date.UTC(year, mm - 1, dd));
  // Rejects 31 February and the like, which pass the range check above.
  if (born.getUTCMonth() !== mm - 1 || born.getUTCDate() !== dd) return null;

  let age = currentYear - year;
  const hadBirthday =
    now.getMonth() > mm - 1 || (now.getMonth() === mm - 1 && now.getDate() >= dd);
  if (!hadBirthday) age -= 1;
  if (age < 0 || age > 120) return null;

  return { dateOfBirth: born.toISOString().slice(0, 10), age };
}

// ---------------------------------------------------------------------------
// Validation — the same rules the server enforces
// ---------------------------------------------------------------------------

/** Recognised so a box is not asked for a suburb it does not have. */
const BOX_PATTERN = /^\s*(p\.?\s*o\.?\s*box|post\s*office\s*box|private\s*bag|postnet\s*suite)\b/i;
export const isPostalBox = (line1: string) => BOX_PATTERN.test(String(line1 || ''));

/**
 * The postal address, checked the way `lib/postalAddress.js` checks it.
 *
 * An empty address is not a problem — the field is optional. A half-filled one
 * is, and the messages are in the order somebody reads the form so the first one
 * they see is about the first field they got wrong.
 */
export function postalProblems(form: ApplicationForm): string[] {
  if (form.postalSameAsResidential) return [];

  const line1 = form.postalLine1.trim();
  const suburb = form.postalSuburb.trim();
  const city = form.postalCity.trim();
  const code = form.postalCode.trim();

  if (!line1 && !suburb && !city && !code) return [];

  const found: string[] = [];
  if (!line1) found.push('Please give the street address, or the PO Box or Private Bag number.');
  if (!isPostalBox(line1) && !suburb) found.push('Please give the suburb or township.');
  if (!city) found.push('Please give the town or city.');
  if (!code) found.push('Please give the four-digit postal code.');
  else if (!/^\d{4}$/.test(code)) found.push('A South African postal code is exactly four digits, for example 1900.');

  return found;
}

/**
 * The ID number, checked leniently — exactly as the server does by default.
 *
 * Length and a real date of birth only. The citizenship and check digits are
 * behind `SA_ID_STRICT` on the server, off until an existing register has been
 * reconciled, because a valid person whose record carries a mistyped check digit
 * would otherwise be locked out.
 */
export function idNumberProblem(idNumber: string): string | null {
  const digits = String(idNumber || '').replace(/\D/g, '');
  if (!digits) return null;
  if (digits.length !== 13) return 'A South African ID number is 13 digits.';
  if (!identityFromIdNumber(digits)) return 'The first six digits should be a date of birth, like 850312.';
  return null;
}

export function cellNumberProblem(cellNumber: string): string | null {
  const digits = String(cellNumber || '').replace(/\D/g, '');
  if (!digits) return null;
  if (digits.length < 10) return 'Please enter a valid cell number, for example 082 123 4567.';
  return null;
}

// ---------------------------------------------------------------------------
// Building the request
// ---------------------------------------------------------------------------

const num = (v: string) => {
  if (v === '' || v === null || v === undefined) return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
};

/**
 * What to PATCH for a given step.
 *
 * Mirrors `buildPayload` in the web client. Two rules are load-bearing:
 *
 *  - Empty strings are skipped, because the server treats them as "not
 *    provided". The exceptions are the postal parts and the consents, which are
 *    always sent as a complete set so that clearing one actually clears it.
 *  - Derived values are never sent. Date of birth, age, the disability
 *    identifier, the composed postal address and the household totals all belong
 *    to the server.
 */
export function buildPayload(form: ApplicationForm, currentStep: number): Record<string, unknown> {
  const payload: Record<string, unknown> = { currentStep };

  const strings = [
    'title', 'maritalStatus', 'surname', 'fullName', 'idNumber', 'sex', 'cellNumber',
    'residentialAddress', 'employerName', 'employerAddress', 'workTelNumber',
    'employmentStatus', 'waterMeterNumber', 'electricityMeterNumber',
    'wardNumber', 'municipalAccountNumber', 'eskomAccountNumber',
    'tenure', 'ownerFullName', 'ownerIdNumber', 'ownerRelationship', 'applicantCategory', 'otherPropertyDetails', 'incomeExclusions',
    'difficultySeeing', 'difficultyHearing', 'difficultyWalking',
    'difficultyRemembering', 'difficultySelfCare', 'difficultyCommunicating',
  ] as const;

  strings.forEach((key) => {
    const value = form[key];
    if (value !== '' && value !== null && value !== undefined) payload[key] = value;
  });

  // The postal address always travels as a set.
  payload.postalSameAsResidential = Boolean(form.postalSameAsResidential);
  if (!form.postalSameAsResidential) {
    (['postalLine1', 'postalLine2', 'postalSuburb', 'postalCity', 'postalCode'] as const)
      .forEach((key) => { payload[key] = form[key] || ''; });
  }

  // Consent is legally load-bearing, so it is always sent — including when it
  // has been withdrawn. Omitting a false would leave a stale "yes" on the record.
  (['consentSiteVisit', 'consentDataMatching', 'declarationTruthful'] as const)
    .forEach((key) => { payload[key] = Boolean(form[key]); });

  // Coordinates move as a pair, or are cleared as a pair. Half a coordinate
  // locates nothing, and the API refuses it.
  const hasPin = form.addressLatitude !== '' && form.addressLongitude !== '';
  if (hasPin) {
    payload.addressLatitude = Number(form.addressLatitude);
    payload.addressLongitude = Number(form.addressLongitude);
    payload.addressSource = form.addressSource || 'MANUAL';
    if (form.addressFormatted) payload.addressFormatted = form.addressFormatted;
    if (form.addressAccuracyM !== '') payload.addressAccuracyM = Number(form.addressAccuracyM);
  } else {
    payload.addressLatitude = null;
    payload.addressLongitude = null;
  }

  (['peopleOnProperty', 'childrenUnder18', 'adults', 'pensionersOver60'] as const).forEach((key) => {
    const n = num(form[key]);
    if (n !== undefined) payload[key] = Math.floor(n);
  });

  (['salary', 'oldAgePension', 'disabilityPension', 'businessIncome', 'rentingIncome'] as const)
    .forEach((key) => {
      const n = num(form[key]);
      if (n !== undefined) payload[key] = n;
    });

  (['ownsImmovableProperty', 'isFullTimeOccupant', 'hasMunicipalArrears',
    'hasArrearsArrangement', 'ownsOtherProperty', 'ownerDeceased'] as const).forEach((key) => {
    if (form[key] === true || form[key] === false) payload[key] = form[key];
  });

  return payload;
}

/**
 * Which wizard steps are genuinely finished.
 *
 * Not "which screens have been visited". A tick that only means somebody walked
 * past is a tick that lies: they would see six of them and then be refused at
 * submission for the very things those ticks implied were done. Each step here
 * is judged on the answers the server actually holds.
 *
 * Deliberately not the same as the submission gate. This drives an indicator, so
 * it asks "has this section been answered" rather than "would the API accept
 * it" — the API remains the authority, and it says so plainly when it refuses.
 */
export type WizardStepKey =
  'particulars' | 'property' | 'income' | 'general' | 'documents';

export function completedSteps(
  form: ApplicationForm,
  documents: { status: string; importance: string; requirementGroup: string | null }[] = []
): WizardStepKey[] {
  const done: WizardStepKey[] = [];

  const filled = (v: string) => Boolean(v && v.trim());

  // The cell number and employment status are no longer asked on this step —
  // the number comes from the verified account, and employment is derived from
  // the income answers — so neither can gate the step being complete.
  if (filled(form.surname) && filled(form.fullName) && filled(form.idNumber)
    && filled(form.residentialAddress)) {
    done.push('particulars');
  }

  // The only step that can be skipped, so it is complete only when truly done.

  if (filled(form.tenure) && form.ownsOtherProperty !== null) done.push('property');

  if (filled(form.peopleOnProperty)) done.push('income');

  // All three, because the server stamps consent only when all three are given.
  if (form.consentSiteVisit && form.consentDataMatching && form.declarationTruthful) {
    done.push('general');
  }

  /**
   * Documents count as done when nothing is outstanding — every required slot
   * filled, and the financial-evidence group satisfied by any one member.
   */
  const required = documents.filter((d) => d.importance === 'REQUIRED');
  const group = documents.filter((d) => d.importance !== 'REQUIRED' && d.requirementGroup);
  const requiredDone = required.length > 0 && required.every((d) => d.status === 'Uploaded');
  const groupDone = group.length === 0 || group.some((d) => d.status === 'Uploaded');
  if (requiredDone && groupDone) done.push('documents');

  return done;
}

/** Money as the API returns it — a Decimal, which arrives as a string. */
export const money = (value: unknown): string => {
  const n = Number(value ?? 0);
  if (!Number.isFinite(n)) return 'R 0.00';
  return `R ${n.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

export const dateZA = (value: unknown): string =>
  (value ? new Date(value as string).toLocaleDateString('en-ZA') : '—');

export const STATUS_LABEL: Record<string, string> = {
  DRAFT: 'Not submitted',
  PENDING: 'Awaiting a decision',
  APPROVED: 'Approved',
  DECLINED: 'Not approved',
};
