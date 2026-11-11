/** Only statically imported, source-reviewed renderers can be selected by a CMS kind. */
import NoticeBlock from './NoticeBlock.vue';
import CardGridBlock from './CardGridBlock.vue';
import FaqGroupBlock from './FaqGroupBlock.vue';
import ImageCardBlock from './ImageCardBlock.vue';
import FaqItemBlock from './FaqItemBlock.vue';
import { CMS_KIND_REGISTRY } from '@smd/content-contracts/cms-kind-registry';
import type { CmsRootNode, CmsChildNode } from '@smd/content-contracts/page-slot-contracts';
export const CMS_COMPONENT_REGISTRY = {
  notice:NoticeBlock,'card-grid':CardGridBlock,'faq-group':FaqGroupBlock,
  'image-card':ImageCardBlock,'faq-item':FaqItemBlock
} as const;
// All entries are checked against the data registry; no CMS-supplied import path.
const sameKinds=Object.keys(CMS_COMPONENT_REGISTRY).sort().join('|')===Object.keys(CMS_KIND_REGISTRY).sort().join('|');
if(!sameKinds)throw new Error('CMS_KIND_RENDERER_REGISTRY_MISMATCH');
export function cmsComponent(node:CmsRootNode|CmsChildNode) {
  switch(node.kind){
    case 'notice':return CMS_COMPONENT_REGISTRY.notice;
    case 'card-grid':return CMS_COMPONENT_REGISTRY['card-grid'];
    case 'faq-group':return CMS_COMPONENT_REGISTRY['faq-group'];
    case 'image-card':return CMS_COMPONENT_REGISTRY['image-card'];
    case 'faq-item':return CMS_COMPONENT_REGISTRY['faq-item'];
    default:throw new Error('CMS_BLOCK_KIND_UNKNOWN');
  }
}
