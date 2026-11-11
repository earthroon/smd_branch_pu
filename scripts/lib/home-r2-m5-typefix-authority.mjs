/** M5 Windows/typecheck repair supersession. Preserve historical CF34/CF45 digests. */
import { CF45_AUTHORIZED_DIGESTS } from './home-r2-cf45-authority.mjs';
export const M5_TYPEFIX_AUTHORIZED_DIGESTS = Object.freeze({
  ...CF45_AUTHORIZED_DIGESTS,
  'app/app.vue': '011fa1427a743663f106aac2d135a948d0008b005a9162ce376a9622198bb979',
});
