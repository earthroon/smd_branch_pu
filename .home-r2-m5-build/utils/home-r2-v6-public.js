/** M4 PUBLIC V6 CONTRACT CANDIDATE. V5 remains untouched.
 * Pure structural/read-authority validator, not a cryptographic signature check;
 * only a trusted Core response can supply a Publication identity.
 */
import { homeR2Source, homeMediaSlots } from "../data/home-r2-manifest.js";
const slotIds = Object.keys(homeMediaSlots).sort();
const faqIds = ['home.faq.01', 'home.faq.02', 'home.faq.03', 'home.faq.04'];
const hex = /^[a-f0-9]{64}$/;
const image = /^sm_[a-f0-9]{64}$/;
const record = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const keys = (v, list) => JSON.stringify(Object.keys(v).sort()) === JSON.stringify([...list].sort());
export class HomeR2PublicV6Error extends Error {
    code;
    constructor(code) { super(code); this.name = 'HomeR2PublicV6Error'; this.code = code; }
}
const fail = (code) => { throw new HomeR2PublicV6Error(code); };
export function validateHomeR2PublicProjection(raw, publication) {
    if (!record(raw) || !keys(raw, ['contract', 'publicationId', 'publicationDigest', 'sourceSnapshotDigest',
        'sourceWitnessDigest', 'draftRevision', 'draftDigest', 'faq', 'mediaBindings', 'assets']) ||
        raw.contract !== 'SMD_HOME_R2_PUBLIC_V1' || raw.publicationId !== publication.id ||
        raw.publicationDigest !== publication.digest || !hex.test(publication.digest) ||
        raw.sourceSnapshotDigest !== homeR2Source.sourceSnapshotDigest ||
        raw.sourceWitnessDigest !== homeR2Source.sourceWitnessDigest ||
        !Number.isSafeInteger(raw.draftRevision) || Number(raw.draftRevision) < 1 ||
        typeof raw.draftDigest !== 'string' || !hex.test(raw.draftDigest) ||
        !Array.isArray(raw.faq) || raw.faq.length > 4 || !Array.isArray(raw.mediaBindings) ||
        raw.mediaBindings.length > 8 || !Array.isArray(raw.assets) || raw.assets.length > 8)
        return fail('SMD_HOME_M4_V6_PROJECTION_INVALID');
    let previous = -1;
    for (const row of raw.faq) {
        if (!record(row) || !keys(row, ['id', 'question', 'answer', 'visible']) || row.visible !== true ||
            typeof row.id !== 'string' || typeof row.question !== 'string' || typeof row.answer !== 'string' ||
            !row.question.trim() || !row.answer.trim() || row.question.length > 300 || row.answer.length > 4000 ||
            /[<>]|\{\{|\}\}|javascript\s*:/i.test(row.question + row.answer) ||
            /^=+$/.test(row.question.replace(/\s/g, '')) || /^=+$/.test(row.answer.replace(/\s/g, '')))
            return fail('SMD_HOME_M4_V6_FAQ_INVALID');
        const idx = faqIds.indexOf(row.id);
        if (idx <= previous)
            return fail('SMD_HOME_M4_V6_FAQ_ORDER_INVALID');
        previous = idx;
    }
    let prev = '';
    const wanted = new Set();
    for (const row of raw.mediaBindings) {
        if (!record(row) || !keys(row, ['slotId', 'assetId', 'alt', 'title', 'displayMode']) ||
            typeof row.slotId !== 'string' || !slotIds.includes(row.slotId) || row.slotId <= prev ||
            typeof row.assetId !== 'string' || !image.test(row.assetId) || row.displayMode !== 'contain' ||
            typeof row.alt !== 'string' || !row.alt.trim() || typeof row.title !== 'string' || !row.title.trim() ||
            row.alt.length > 240 || row.title.length > 240 || /[<>]/.test(row.alt + row.title))
            return fail('SMD_HOME_M4_V6_MEDIA_BINDING_INVALID');
        prev = row.slotId;
        wanted.add(row.assetId);
    }
    const unique = [...wanted].sort();
    if (raw.assets.length !== unique.length)
        return fail('SMD_HOME_M4_V6_MEDIA_ASSETS_INVALID');
    for (let i = 0; i < raw.assets.length; i++) {
        const a = raw.assets[i];
        if (!record(a) || !keys(a, ['assetId', 'width', 'height', 'mimeType']) || a.assetId !== unique[i] ||
            !Number.isSafeInteger(a.width) || Number(a.width) < 1 || !Number.isSafeInteger(a.height) || Number(a.height) < 1 ||
            !['image/png', 'image/jpeg', 'image/webp'].includes(String(a.mimeType)))
            return fail('SMD_HOME_M4_V6_MEDIA_ASSETS_INVALID');
    }
    return raw;
}
export function resolveHomeR2PublicImage(projection, current, slotId) {
    if (!projection)
        return null;
    if (!current)
        return fail('SMD_HOME_M4_V6_PUBLICATION_STALE');
    validateHomeR2PublicProjection(projection, current);
    if (!slotIds.includes(slotId))
        return fail('SMD_HOME_M4_V6_SLOT_INVALID');
    const binding = projection.mediaBindings.find(x => x.slotId === slotId);
    if (!binding)
        return null;
    const a = projection.assets.find(x => x.assetId === binding.assetId);
    if (!a)
        return fail('SMD_HOME_M4_V6_MEDIA_ASSETS_INVALID');
    return { src: `/api/media/home-r2/${a.assetId}`, alt: binding.alt, title: binding.title,
        width: a.width, height: a.height, assetId: a.assetId };
}
