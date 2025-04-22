import * as pdfjsLib from 'pdfjs-dist';
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;

const DEBUG = true;

interface DarfData {
  code: string;
  taxType: string;
  period: string; 
  dueDate: string;
  principal: number;
  fine: number;
  interest: number;
  totalValue: number;
  cno?: string; // CNO para CP-PATRONAL
}

// Lista de códigos válidos de tributo com seus padrões específicos
const CODE_PATTERNS = {
  '6912': 'PIS|NAO CUMULATIVO',
  '5856': 'COFINS|NAO CUMULATIVO',
  '2172': 'COFINS|NAO CUMULATIVO',
  '8109': 'PIS|NAO CUMULATIVO',
  '3373': 'IRPJ',
  '6012': 'CSLL',
  '1170': 'CP-TERCEIROS|TERCEIROS',
  '1646': 'CP-PATRONAL|PATRONAL'
};

function parseValue(str: string): number {
  return parseFloat(str.replace(/[^\d,]/g, '').replace(',', '.'));
}

function cleanText(text: string): string {
  // Remove caracteres especiais e espaços extras
  return text.replace(/\\n/g, '\n')
            .replace(/\s+/g, ' ')
            .trim();
}

function getTaxType(code: string): string {
  const taxTypes: Record<string, string> = {
    '6912': 'PIS',
    '5856': 'COFINS',
    '2172': 'COFINS',
    '8109': 'PIS',
    '3373': 'IRPJ',
    '6012': 'CSLL',
    '1170': 'CP-TERCEIROS',
    '1646': 'CP-PATRONAL'
  };

  return taxTypes[code] || 'Unknown';
}

function extractCNO(text: string): string | undefined {
  const cnoMatch = text.match(/CNO\s*([\d.]+\/\d+)/);
  return cnoMatch ? cnoMatch[1] : undefined;
}

export async function processDarfPDF(file: File): Promise<DarfData[]> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
  
  if (DEBUG) {
    console.log('=== Processing DARF PDF ===');
    console.log('Number of pages:', pdf.numPages);
  }

  let text = '';
  
  // Extract text from all pages
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items
      .map((item: any) => item.str)
      .join(' ');
    
    text += pageText + '\n';
  }

  text = cleanText(text);

  if (DEBUG) {
    console.log('=== Extracted Text ===');
    console.log(text);
  }

  // Parse DARF data
  try {
    const darfItems: DarfData[] = [];
    
    // Processa cada código com seu padrão específico
    for (const [code, pattern] of Object.entries(CODE_PATTERNS)) {
      // Expressão regular específica para cada tipo de tributo
      const regex = new RegExp(
        `${code}[^]*?(?:${pattern})[^]*?(\\d[\\d.,]+)\\s+(?:R\\$\\s*)?(\\d[\\d.,]+|0,00|0\\.00)\\s+(?:R\\$\\s*)?(\\d[\\d.,]+|0,00|0\\.00)\\s+(?:R\\$\\s*)?(\\d[\\d.,]+|0,00|0\\.00)`,
        'g'
      );

      let match;
      while ((match = regex.exec(text)) !== null) {
        const principal = parseValue(match[1]);
        const fine = parseValue(match[2]);
        const interest = parseValue(match[3]);
        const totalValue = parseValue(match[4]);

        // Encontra o período e vencimento mais próximo antes deste match
        const contextText = text.substring(0, match.index + match[0].length);
        const periodMatch = contextText.match(/PA\s*(\d{2}\/\d{4})/g);
        const period = periodMatch ? periodMatch[periodMatch.length - 1].replace('PA', '').trim() : '';

        const dueDateMatch = contextText.match(/Vencimento\s*(\d{2}\/\d{2}\/\d{4})/g);
        const dueDate = dueDateMatch ? dueDateMatch[dueDateMatch.length - 1].replace('Vencimento', '').trim() : '';

        // Para CP-PATRONAL, extrai o CNO do contexto
        const cno = code === '1646' ? extractCNO(contextText) : undefined;

        const darfData: DarfData = {
          code,
          taxType: getTaxType(code),
          period,
          dueDate,
          principal,
          fine,
          interest,
          totalValue,
          ...(cno && { cno }) // Adiciona CNO apenas se encontrado
        };

        if (DEBUG) {
          console.log(`=== Found DARF Item for code ${code} ===`);
          console.log(darfData);
        }

        darfItems.push(darfData);
      }
    }

    if (darfItems.length === 0) {
      console.error('Nenhum item DARF encontrado');
      return [];
    }

    if (DEBUG) {
      console.log('=== All DARF Items ===');
      console.log(darfItems);
    }

    return darfItems;
  } catch (error) {
    console.error('Error parsing DARF:', error);
    return [];
  }
}
