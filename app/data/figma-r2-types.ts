/** Source-derived renderer ABI, not a new Figma format or publication schema. */
export type FigmaRect=readonly [number,number,number,number];
export type FigmaAffine=readonly [number,number,number,number,number,number];
export interface FigmaSceneNode {
 key:string;name:string;kind:string;parent:string|null;order:number;rect:FigmaRect;affine:FigmaAffine;
 visible:boolean;blendMode:string;childKeys:string[];renderCase:string;renderStatus:string;
 reasonCode:string|null;clipCase:string;clippedChildren:boolean;clipScopeKey:string|null;radii:readonly [number,number,number,number];
}
export interface FigmaSceneOperation {
 kind:'asset'|'text'|'self-paint';nodeKey:string;sourceRef:string;orderPath:number[];effectiveClipScopeKeys:string[];
}
export interface FigmaSceneTextRun {characters:string;start:number;end:number;style:Record<string,string|number>}
export interface FigmaSceneText {
 characters:string;digest:string;layout:{alignHorizontal:string;alignVertical:string;autoResize:string;height:number;width:number;maxLines:number|null;truncation:string};
 properties:{autoResize:string;opacity:number};runs:FigmaSceneTextRun[];
}
export interface FigmaSceneV1 {
 contract:'SMD_FIGMA_SCENE_VR1';sourceSnapshotDigest:string;sourceWitnessDigest:string;
 viewport:number[];fullFrame:number[];originalQualification:'BLOCKED'|string;originalPhysicalParity:string;productCommitAllowed:false;
 sections:{id:string;nodeKey:string;top:number;height:number;width:number}[];
 nodes:Record<string,FigmaSceneNode>;
 assets:Record<string,{src:string;sha256:string}>;
 operations:FigmaSceneOperation[];
 operationByNode:Record<string,FigmaSceneOperation>;
 texts:Record<string,FigmaSceneText>;
 selfPaints:Record<string,{fills:{paintType:string;visible:boolean;opacity:number;rgba?:readonly [number,number,number,number];[key:string]:unknown}[];strokes:unknown[];opacity:number}>;
 lines:Record<string,{status:string;stroke:{weight:number;[key:string]:unknown};exportEvidence:{method:string;[key:string]:unknown};conservativeInkBounds:number[]}>;
 blockers:{nodeKey:string;reasonCode:string;clipCase:string}[];
 ownership:{operationIndex:number;nodeKey:string;paintKind:string;sourceRef:string;orderPath:number[];effectiveClipScopeKeys:string[];owner:string;note:string}[];
 ownerCounts:Record<string,number>;
}
