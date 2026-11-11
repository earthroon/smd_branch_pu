import {selectVisibleArchiveAny,archiveLaneOf,validateArchiveCollectionAny,
  type ArchiveCollectionAny,type ArchiveVideoThumbnailV1} from '@smd/content-contracts/archive-contracts';
import type {ArchiveItem} from '@smd/content-contracts/contracts';
export type ArchiveCardView=Readonly<{
  id:string;title:string;description:string;media:
  |{kind:'image';assetKey:string;alt:string}
  |{kind:'youtube';youtubeId:string;posterKey:string|null;thumbnails:readonly ArchiveVideoThumbnailV1[]}
  |{kind:'legacy-image';src:string;alt:string}
  |{kind:'placeholder'};
}>;
type LegacyArchive={filters:string[];items:ArchiveItem[]};
function isLegacyArchive(value:ArchiveCollectionAny|LegacyArchive):value is LegacyArchive {
  return !('kind' in value)&&'filters' in value&&Array.isArray(value.filters);
}
/** R3A V3 is split by lane. Historical V2 remains unmodified when lane is not requested. */
export function archiveView(value:ArchiveCollectionAny|LegacyArchive,lane?:'photo'|'video'):ArchiveCardView[]{
  if(value&&'kind' in value&&value.kind==='archive-collection'){
    const archive=validateArchiveCollectionAny(value);
    const items=selectVisibleArchiveAny(archive,lane);
    return items.map(item=>({id:item.id,title:item.title,description:item.description,
      media:item.media?.kind==='youtube'?{
        ...item.media,thumbnails:'thumbnails' in item.media?item.media.thumbnails:[]
      }:item.media??{kind:'placeholder' as const}}));
  }
  if(!isLegacyArchive(value))throw new Error('ARCHIVE_LEGACY_SCHEMA_INVALID');
  return value.items.map((item,index)=>({id:`legacy-${index}-${item.title}`,title:item.title,
    description:item.sub,media:item.image?{kind:'legacy-image' as const,src:item.image,alt:item.title}:
      {kind:'placeholder' as const}}));
}
