export function filmHorizontal(e:{ctrlKey:boolean;shiftKey:boolean;deltaX:number;deltaY:number}):boolean {
 return !e.ctrlKey && (e.shiftKey || Math.abs(e.deltaX)>Math.abs(e.deltaY));
}
export function filmTap(distance:number,elapsed:number,scrollDelta:number):boolean {
 return Number.isFinite(distance+elapsed+scrollDelta)&&distance<=8&&elapsed>=0&&elapsed<=600&&Math.abs(scrollDelta)<=2;
}
