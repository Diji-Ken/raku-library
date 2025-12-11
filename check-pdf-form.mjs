import { PDFDocument } from 'pdf-lib';
import fs from 'fs';

async function checkPDFForm() {
  try {
    // PDFファイルを読み込む
    const pdfBytes = fs.readFileSync('./public/files/pdf_resume01.pdf');
    const pdfDoc = await PDFDocument.load(pdfBytes);

    console.log('=== PDF情報 ===');
    console.log(`ページ数: ${pdfDoc.getPageCount()}`);

    // フォームを取得
    const form = pdfDoc.getForm();
    const fields = form.getFields();

    console.log(`\nフォームフィールド数: ${fields.length}`);

    if (fields.length > 0) {
      console.log('\n=== フォームフィールド一覧 ===');
      fields.forEach((field, index) => {
        const type = field.constructor.name;
        const name = field.getName();
        console.log(`${index + 1}. 名前: "${name}", 種類: ${type}`);
      });
    } else {
      console.log('\nこのPDFにはフォームフィールドがありません。');
      console.log('→ 座標を指定してテキストを配置する必要があります。');
    }

  } catch (error) {
    console.error('エラー:', error.message);
  }
}

checkPDFForm();
