import type {HomeR2PublicProjectionV1} from '~/utils/home-r2-v6-public';
/** Assigned only by root route+publication admission, never fetched independently. */
export const useHomeR2Published=()=>useState<HomeR2PublicProjectionV1|null>('smd-home-r2-published',()=>null);
