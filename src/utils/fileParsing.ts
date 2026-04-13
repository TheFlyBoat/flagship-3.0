import * as pdfjsLib from 'pdfjs-dist';
import * as mammoth from 'mammoth';

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://esm.sh/pdfjs-dist@4.5.136/build/pdf.worker.mjs`;

export const parseFile = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
            const reader = new FileReader();
            reader.onload = async (e) => {
                if (!e.target?.result) return reject('Failed to read file.');
                try {
                    const arrayBuffer = e.target.result as ArrayBuffer;
                    const result = await mammoth.extractRawText({ arrayBuffer });
                    resolve(result.value);
                } catch (error) {
                    reject('Failed to read the DOCX file. It might be corrupted.');
                }
            };
            reader.onerror = () => reject('Error reading file.');
            reader.readAsArrayBuffer(file);
        } else if (file.type === 'application/pdf') {
            const reader = new FileReader();
            reader.onload = async (e) => {
                if (!e.target?.result) return reject('Failed to read file.');
                try {
                    const typedarray = new Uint8Array(e.target.result as ArrayBuffer);
                    const pdf = await pdfjsLib.getDocument(typedarray).promise;
                    let fullText = '';
                    for (let i = 1; i <= pdf.numPages; i++) {
                        const page = await pdf.getPage(i);
                        const textContent = await page.getTextContent();
                        const pageText = textContent.items.map(item => ('str' in item ? item.str : '')).join(' ');
                        fullText += pageText + '\n\n';
                    }
                    resolve(fullText.trim());
                } catch (error) {
                    reject('Failed to read the PDF file. It might be corrupted or in an unsupported format.');
                }
            };
            reader.onerror = () => reject('Error reading file.');
            reader.readAsArrayBuffer(file);
        } else if (file.type === 'text/plain') {
            const reader = new FileReader();
            reader.onload = (e) => {
                resolve(e.target?.result as string);
            };
            reader.onerror = () => reject('Error reading file.');
            reader.readAsText(file, 'UTF-8');
        } else {
            reject(`Unsupported file type: '${file.name}'. Please upload a .txt, .pdf, or .docx file.`);
        }
    });
};
