const sampleImages = [
  'https://images.unsplash.com/photo-1503387762-592deb58ef4e?q=80&w=400',
  'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?q=80&w=400',

 
];
export async function fetchItems(){
  // mock 100 rows
  const rows = Array.from({length:100}).map((_,i)=> ({
    id:i+1,
    select:false,
    code:String(i+1).padStart(6,'0'),
    name:['VT 001','Bolcano - Cavat','Ổ bi thép 12','Ốc lục giác','Đẹp lẻ size 37 màu C','Gõ bắn đinh'][i%6],
    unit:['Bộ','Cái','Chiếc'][i%3],
    category: i%2===0?'Hàng hóa':'Thành phẩm',
    group1:['Ngành hàng Giấy','Ngành hàng In','Nhóm A'][i%3],
    group2: i%3===0?'—':'Phụ kiện',
    batchTrack: i%3===0,
    spec: 1551 + (i%5),
    tkThu: 51111 + (i%4),
    tkGiaVon: 63211 + (i%5),
    img: sampleImages[i%sampleImages.length],
    status: i%2===0? 'Còn sử dụng':'Ngưng sử dụng'
  }));
  return rows;
}
