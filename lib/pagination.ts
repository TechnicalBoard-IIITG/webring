export function resultRange(page:number,limit:number,total:number) {
 if(total===0)return '0 results';
 const start=(page-1)*limit+1;
 const end=Math.min(page*limit,total);
 return `Showing ${Math.min(start,total)}–${end} of ${total}`;
}
