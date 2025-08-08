const pdf = require('pdf-parse');
const { Buffer } = require('buffer');

// Helper functions
function parseBrCurrency(valueStr) {
  if (!valueStr || typeof valueStr !== 'string') return 0.0;
  
  // Remove R$, spaces, and dots (thousand separator). Replace comma (decimal) with dot.
  const cleanedStr = valueStr.replace(/[R$\s.]/g, '').replace(',', '.');
  
  if (!cleanedStr || !/^-?[\d.]+$/.test(cleanedStr)) {
    console.log(`Warning: Invalid monetary value '${valueStr}', returning 0.0`);
    return 0.0;
  }
  
  try {
    return parseFloat(cleanedStr);
  } catch (error) {
    console.log(`Warning: Failed to convert monetary value '${valueStr}' to float, returning 0.0`);
    return 0.0;
  }
}

function formatDate(dateStr) {
  if (!dateStr || typeof dateStr !== 'string') return "";
  
  const match = dateStr.trim().match(/(\d{2})\/(\d{2})\/(\d{4})/);
  if (match) {
    return `${match[3]}-${match[2]}-${match[1]}`; // YYYY-MM-DD
  }
  
  console.log(`Warning: Invalid date format '${dateStr}', returning empty.`);
  return "";
}

function formatPeriodo(periodoStr) {
  if (!periodoStr || typeof periodoStr !== 'string') return "";
  
  const trimmed = periodoStr.trim();
  
  // Match MM/YYYY
  const matchMes = trimmed.match(/(\d{2})\/(\d{4})/);
  if (matchMes) {
    return `${matchMes[1]}/${matchMes[2]}`;
  }
  
  // Match N TRIM/YYYY
  const matchTrim = trimmed.match(/(\d{1,2})(?:º|o|ª|\s)?\s*TRIM\/(\d{4})/i);
  if (matchTrim) {
    return `${matchTrim[1]} TRIM/${matchTrim[2]}`;
  }
  
  console.log(`Warning: Invalid period format '${periodoStr}', returning empty.`);
  return "";
}

function preprocessText(text) {
  const lines = text.split('\n');
  const cleanedLines = [];
  
  const skipPatterns = [
    "MINISTÉRIO DA FAZENDA",
    "Por meio do e-CAC",
    "SECRETARIA ESPECIAL",
    "PROCURADORIA-GERAL",
    "Página:",
    "INFORMAÇÕES DE APOIO"
  ];
  
  for (const line of lines) {
    if (!skipPatterns.some(pattern => line.includes(pattern))) {
      cleanedLines.push(line);
    }
  }
  
  // Remove consecutive empty lines
  const resultLines = [];
  let prevEmpty = false;
  
  for (const line of cleanedLines) {
    if (!line.trim()) {
      if (!prevEmpty) {
        resultLines.push(line);
      }
      prevEmpty = true;
    } else {
      resultLines.push(line);
      prevEmpty = false;
    }
  }
  
  return resultLines.join('\n');
}

// Extract functions
function extractPendenciasDebito(text) {
  const result = [];
  const lines = text.split('\n');
  let inSection = false;
  let currentCnpj = "";
  
  const startPattern = /(?:Pendência|Pendencia|PENDÊNCIA|PENDENCIA)[\s-]*(?:Débito|Debito|DÉBITO|DEBITO)[\s-]*(?:\(SIEF\)|\(sief\))/i;
  const endPatterns = [
    /^(?:Pendência|Pendencia|Parcelamento|Processo|Inscrição|Débito\s+com\s+Exigibilidade)/i,
    /Final\s+do\s+Relatório/i,
    /^\s*_{10,}\s*$/
  ];
  
  console.log("\n--- Starting search for 'Pendência - Débito (SIEF)' section ---");
  
  let i = 0;
  while (i < lines.length) {
    const line = lines[i].trim();
    
    if (!inSection && startPattern.test(line)) {
      inSection = true;
      currentCnpj = "";
      console.log(`Section 'Pendência - Débito (SIEF)' found at line ${i+1}: '${line}'`);
      i++;
      continue;
    }
    
    if (!inSection) {
      i++;
      continue;
    }
    
    if (endPatterns.some(pattern => pattern.test(line))) {
      console.log(`End of section detected at line ${i+1}: '${line}'`);
      inSection = false;
      break;
    }
    
    if (!line) {
      i++;
      continue;
    }
    
    // Try to find CNPJ
    const cnpjMatch = line.match(/CNPJ:\s*(\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2})/);
    if (cnpjMatch) {
      currentCnpj = cnpjMatch[1];
      console.log(`CNPJ set to: ${currentCnpj}`);
      i++;
      continue;
    }
    
    // Skip header lines
    if (line.includes("Receita") && line.includes("PA/Exerc") && line.includes("Vcto")) {
      i++;
      continue;
    }
    
    // Check if line starts with a receipt code
    const receitaMatch = line.match(/^(\d{4}-\d{2}\s+-\s+.*)/);
    if (receitaMatch && currentCnpj) {
      console.log(`\nDebit record start found: '${line}'`);
      const debitoData = {
        cnpj: currentCnpj,
        receita: receitaMatch[1].trim(),
        periodo_apuracao: "",
        vencimento: "",
        valor_original: 0.0,
        saldo_devedor: 0.0,
        multa: 0.0,
        juros: 0.0,
        saldo_devedor_consolidado: 0.0,
        situacao: ""
      };
      
      // Collect next lines
      let j = i + 1;
      const collectedLines = [];
      
      while (j < lines.length) {
        const nextLine = lines[j].trim();
        
        if (/^(\d{4}-\d{2}\s+-\s+.*)/.test(nextLine)) break;
        if (endPatterns.some(pattern => pattern.test(nextLine))) break;
        if (/CNPJ:\s*(\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2})/.test(nextLine)) break;
        if (nextLine.includes("Receita") && nextLine.includes("PA/Exerc")) break;
        
        if (nextLine) {
          collectedLines.push(nextLine);
        }
        j++;
      }
      
      // Analyze collected lines
      for (const lineContent of collectedLines) {
        // Period (MM/YYYY or N TRIM/YYYY)
        if (/(\d{2})\/(\d{4})/.test(lineContent) || /(\d{1,2})(?:º|o|ª|\s)?\s*TRIM\/(\d{4})/i.test(lineContent)) {
          if (!debitoData.periodo_apuracao) {
            debitoData.periodo_apuracao = formatPeriodo(lineContent);
          }
        }
        // Date (DD/MM/YYYY)
        else if (/(\d{2})\/(\d{2})\/(\d{4})/.test(lineContent)) {
          if (!debitoData.vencimento) {
            debitoData.vencimento = formatDate(lineContent);
          }
        }
        // Monetary values
        else if (/^[\d.,]+$/.test(lineContent) && (lineContent.includes(',') || lineContent.includes('.'))) {
          const valor = parseBrCurrency(lineContent);
          if (valor > 0) {
            if (!debitoData.valor_original) {
              debitoData.valor_original = valor;
            } else if (!debitoData.saldo_devedor) {
              debitoData.saldo_devedor = valor;
            } else if (!debitoData.saldo_devedor_consolidado) {
              debitoData.saldo_devedor_consolidado = valor;
            } else if (!debitoData.multa) {
              debitoData.multa = valor;
            } else if (!debitoData.juros) {
              debitoData.juros = valor;
            }
          }
        }
        // Situation
        else {
          if (!debitoData.situacao && lineContent) {
            if (!/\d{4}-\d{2}/.test(lineContent) && !/\d{2}\/\d{4}/.test(lineContent)) {
              debitoData.situacao = lineContent;
            }
          }
        }
      }
      
      // Validation
      if (debitoData.receita && debitoData.periodo_apuracao && debitoData.vencimento) {
        result.push(debitoData);
        console.log(`✅ Item extracted successfully: ${JSON.stringify(debitoData)}`);
        i = j;
      } else {
        i++;
      }
    } else {
      i++;
    }
  }
  
  return result;
}

function extractDebitosExigSuspensaSief(text) {
  const result = [];
  const lines = text.split('\n');
  let inSection = false;
  let currentCnpj = "";
  let currentCno = "";
  
  const startPattern = /Débito\s+com\s+Exigibilidade\s+Suspensa\s+\(SIEF\)/i;
  const endPatterns = [
    /^(?:Pendência|Pendencia|Parcelamento|Processo|Inscrição|Débito\s+com\s+Exigibilidade)/i,
    /Final\s+do\s+Relatório/i,
    /^\s*_{10,}\s*$/,
    /Diagnóstico\s+Fiscal\s+na\s+Procuradoria-Geral/i
  ];
  
  console.log("\n--- Starting search for 'Débito com Exigibilidade Suspensa (SIEF)' section ---");
  
  let i = 0;
  while (i < lines.length) {
    const line = lines[i].trim();
    
    if (!inSection && startPattern.test(line)) {
      inSection = true;
      currentCnpj = "";
      currentCno = "";
      console.log(`Section found at line ${i+1}: '${line}'`);
      i++;
      continue;
    }
    
    if (!inSection) {
      i++;
      continue;
    }
    
    if (endPatterns.some(pattern => pattern.test(line))) {
      console.log(`End of section detected at line ${i+1}: '${line}'`);
      inSection = false;
      break;
    }
    
    if (!line) {
      i++;
      continue;
    }
    
    // Try to find CNPJ
    const cnpjMatch = line.match(/CNPJ:\s*(\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2})/);
    if (cnpjMatch) {
      currentCnpj = cnpjMatch[1];
      console.log(`CNPJ set to: ${currentCnpj}`);
      i++;
      continue;
    }
    
    // Try to find CNO
    const cnoMatch = line.match(/CNO:\s*([\d.\/-]+)/);
    if (cnoMatch) {
      currentCno = cnoMatch[1];
      console.log(`CNO set to: ${currentCno}`);
    }
    
    // Skip header lines
    if (line.includes("Receita") && line.includes("PA/Exerc") && line.includes("Vcto") && line.includes("Situação")) {
      i++;
      continue;
    }
    
    // Check if line starts with a receipt code
    const receitaMatch = line.match(/^(\d{4}-\d{2}\s+-\s+.*)/);
    if (receitaMatch && currentCnpj) {
      console.log(`\nDebit record found: '${line}'`);
      const debitoData = {
        cnpj: currentCnpj,
        cno: currentCno || "",
        receita: receitaMatch[1].trim()
      };
      
      // Expect 5 fields in next lines
      const expectedFieldsCount = 5;
      const dataLines = lines.slice(i + 1, i + 1 + expectedFieldsCount);
      
      if (dataLines.length === expectedFieldsCount) {
        try {
          debitoData.periodo_apuracao = formatPeriodo(dataLines[0]);
          debitoData.vencimento = formatDate(dataLines[1]);
          debitoData.valor_original = parseBrCurrency(dataLines[2]);
          debitoData.saldo_devedor = parseBrCurrency(dataLines[3]);
          debitoData.situacao = dataLines[4].trim();
          
          if (debitoData.receita && debitoData.periodo_apuracao && debitoData.vencimento) {
            result.push(debitoData);
            console.log(`Item extracted: ${JSON.stringify(debitoData)}`);
            i += 1 + expectedFieldsCount;
            currentCno = "";
          } else {
            i++;
          }
        } catch (error) {
          console.log(`Error processing: ${error}`);
          i++;
        }
      } else {
        i++;
      }
    } else {
      if (!cnoMatch) {
        console.log(`Line ignored: '${line}'`);
      }
      i++;
    }
  }
  
  return result;
}

function extractParcelamentosSiefpar(text) {
  const result = [];
  const lines = text.split('\n');
  let inSection = false;
  let currentCnpj = "";
  
  const startPattern = /Parcelamento\s+com\s+Exigibilidade\s+Suspensa\s+\(SIEFPAR\)/i;
  const endPatterns = [
    /^(?:Pendência|Pendencia|Processo|Inscrição|Débito\s+com\s+Exigibilidade)/i,
    /Final\s+do\s+Relatório/i,
    /^\s*_{10,}\s*$/,
    /Diagnóstico\s+Fiscal\s+na\s+Procuradoria-Geral/i
  ];
  
  console.log("\n--- Starting search for 'Parcelamento com Exigibilidade Suspensa (SIEFPAR)' section ---");
  
  let i = 0;
  while (i < lines.length) {
    const line = lines[i].trim();
    
    if (!inSection && startPattern.test(line)) {
      inSection = true;
      currentCnpj = "";
      console.log(`Section found at line ${i+1}: '${line}'`);
      i++;
      continue;
    }
    
    if (!inSection) {
      i++;
      continue;
    }
    
    if (endPatterns.some(pattern => pattern.test(line))) {
      console.log(`End of section detected at line ${i+1}: '${line}'`);
      inSection = false;
      break;
    }
    
    if (!line) {
      i++;
      continue;
    }
    
    // Try to find CNPJ
    const cnpjMatch = line.match(/CNPJ:\s*(\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2})/);
    if (cnpjMatch) {
      currentCnpj = cnpjMatch[1];
      console.log(`CNPJ set to: ${currentCnpj}`);
      i++;
      continue;
    }
    
    // Try to find installment record
    const parcelamentoMatch = line.match(/Parcelamento:\s*(\d+)/i);
    if (parcelamentoMatch && currentCnpj) {
      const parcelamentoNum = parcelamentoMatch[1].trim();
      console.log(`\nPossible SIEFPAR record found: '${line}'`);
      
      if (i + 2 < lines.length) {
        const linhaValor = lines[i + 1].trim();
        const linhaModalidade = lines[i + 2].trim();
        
        const valorMatch = linhaValor.match(/Valor Suspenso:\s*([\d.,]+)/i);
        const modalidadeTexto = linhaModalidade.replace(/Modalidade:/i, "").trim();
        
        if (valorMatch) {
          const valorSuspenso = parseBrCurrency(valorMatch[1]);
          
          const parcelamentoData = {
            cnpj: currentCnpj,
            parcelamento: parcelamentoNum,
            valor_suspenso: valorSuspenso,
            modalidade: modalidadeTexto
          };
          
          result.push(parcelamentoData);
          console.log(`SIEFPAR item extracted: ${JSON.stringify(parcelamentoData)}`);
          i += 3;
        } else {
          i++;
        }
      } else {
        i++;
      }
    } else {
      i++;
    }
  }
  
  return result;
}

function extractPendenciasInscricaoSida(text) {
  const result = [];
  const lines = text.split('\n');
  let inSection = false;
  let currentCnpj = "";
  
  const startPattern = /Pendência\s+-\s+Inscrição\s+em\s+Dívida\s+Ativa\s+\(SIDA\)/i;
  const endPatterns = [
    /^(?:Pendência|Pendencia|Parcelamento|Processo|Inscrição|Débito\s+com\s+Exigibilidade)/i,
    /Final\s+do\s+Relatório/i,
    /^\s*_{10,}\s*$/,
    /Diagnóstico\s+Fiscal\s+na\s+Procuradoria-Geral/i
  ];
  
  console.log("\n--- Starting search for 'Pendência - Inscrição em Dívida Ativa (SIDA)' section ---");
  
  let i = 0;
  while (i < lines.length) {
    const line = lines[i].trim();
    
    if (!inSection && startPattern.test(line)) {
      inSection = true;
      currentCnpj = "";
      console.log(`Section found at line ${i+1}: '${line}'`);
      i++;
      continue;
    }
    
    if (!inSection) {
      i++;
      continue;
    }
    
    if (endPatterns.some(pattern => pattern.test(line))) {
      console.log(`End of section detected at line ${i+1}: '${line}'`);
      inSection = false;
      break;
    }
    
    if (!line) {
      i++;
      continue;
    }
    
    // Try to find CNPJ
    const cnpjMatch = line.match(/CNPJ:\s*(\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2})/);
    if (cnpjMatch) {
      currentCnpj = cnpjMatch[1];
      console.log(`CNPJ set to: ${currentCnpj}`);
      i++;
      continue;
    }
    
    // Skip header lines
    if (line.includes("Inscrição") && line.includes("Situação") && line.includes("Valor Consolidado")) {
      i++;
      continue;
    }
    
    // Check for inscription number
    const inscricaoMatch = line.match(/^(\d{2}\.\d{1,2}\.\d{3}\.\d{6}-\d{2})/);
    if (inscricaoMatch && currentCnpj) {
      console.log(`\nSIDA record found: '${line}'`);
      const inscricaoData = {
        cnpj: currentCnpj,
        inscricao: inscricaoMatch[1]
      };
      
      // Expect 2 more fields
      if (i + 2 < lines.length) {
        try {
          inscricaoData.situacao = lines[i + 1].trim();
          inscricaoData.valor_consolidado = parseBrCurrency(lines[i + 2]);
          
          if (inscricaoData.inscricao && inscricaoData.situacao) {
            result.push(inscricaoData);
            console.log(`SIDA item extracted: ${JSON.stringify(inscricaoData)}`);
            i += 3;
          } else {
            i++;
          }
        } catch (error) {
          console.log(`Error processing SIDA: ${error}`);
          i++;
        }
      } else {
        i++;
      }
    } else {
      i++;
    }
  }
  
  return result;
}

function extractPendenciasParcelamentoSispar(text) {
  const result = [];
  const lines = text.split('\n');
  let inSection = false;
  let currentCnpj = "";
  
  const startPattern = /Pendência\s+-\s+Parcelamento\s+de\s+Débito\s+Inscrito\s+em\s+DAU\s+\(SISPAR\)/i;
  const endPatterns = [
    /^(?:Pendência|Pendencia|Parcelamento|Processo|Inscrição|Débito\s+com\s+Exigibilidade)/i,
    /Final\s+do\s+Relatório/i,
    /^\s*_{10,}\s*$/
  ];
  
  console.log("\n--- Starting search for 'Pendência - Parcelamento de Débito Inscrito em DAU (SISPAR)' section ---");
  
  let i = 0;
  while (i < lines.length) {
    const line = lines[i].trim();
    
    if (!inSection && startPattern.test(line)) {
      inSection = true;
      currentCnpj = "";
      console.log(`Section found at line ${i+1}: '${line}'`);
      i++;
      continue;
    }
    
    if (!inSection) {
      i++;
      continue;
    }
    
    if (endPatterns.some(pattern => pattern.test(line))) {
      console.log(`End of section detected at line ${i+1}: '${line}'`);
      inSection = false;
      break;
    }
    
    if (!line) {
      i++;
      continue;
    }
    
    // Try to find CNPJ
    const cnpjMatch = line.match(/CNPJ:\s*(\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2})/);
    if (cnpjMatch) {
      currentCnpj = cnpjMatch[1];
      console.log(`CNPJ set to: ${currentCnpj}`);
      i++;
      continue;
    }
    
    // Skip header lines
    if (line.includes("Parcelamento") && line.includes("Situação") && line.includes("Valor Consolidado")) {
      i++;
      continue;
    }
    
    // Check for parcelamento number
    const parcelamentoMatch = line.match(/^(\d{17})/);
    if (parcelamentoMatch && currentCnpj) {
      console.log(`\nSISPAR record found: '${line}'`);
      const parcelamentoData = {
        cnpj: currentCnpj,
        parcelamento: parcelamentoMatch[1]
      };
      
      // Expect 2 more fields
      if (i + 2 < lines.length) {
        try {
          parcelamentoData.situacao = lines[i + 1].trim();
          parcelamentoData.valor_consolidado = parseBrCurrency(lines[i + 2]);
          
          if (parcelamentoData.parcelamento && parcelamentoData.situacao) {
            result.push(parcelamentoData);
            console.log(`SISPAR item extracted: ${JSON.stringify(parcelamentoData)}`);
            i += 3;
          } else {
            i++;
          }
        } catch (error) {
          console.log(`Error processing SISPAR: ${error}`);
          i++;
        }
      } else {
        i++;
      }
    } else {
      i++;
    }
  }
  
  return result;
}

function extractDarfData(text) {
  const result = {
    periodo_apuracao: "",
    data_vencimento: "",
    valor_principal: 0.0,
    valor_multa: 0.0,
    valor_juros: 0.0,
    valor_total: 0.0,
    codigo_receita: "",
    numero_referencia: "",
    cnpj: ""
  };
  
  const lines = text.split('\n');
  
  for (const line of lines) {
    // Extract CNPJ
    const cnpjMatch = line.match(/CNPJ[:\s]+(\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2})/);
    if (cnpjMatch) {
      result.cnpj = cnpjMatch[1];
    }
    
    // Extract period
    const periodoMatch = line.match(/Período\s+de\s+Apuração[:\s]+(\d{2}\/\d{2}\/\d{4})/i);
    if (periodoMatch) {
      result.periodo_apuracao = formatDate(periodoMatch[1]);
    }
    
    // Extract due date
    const vencimentoMatch = line.match(/Data\s+de\s+Vencimento[:\s]+(\d{2}\/\d{2}\/\d{4})/i);
    if (vencimentoMatch) {
      result.data_vencimento = formatDate(vencimentoMatch[1]);
    }
    
    // Extract receipt code
    const codigoMatch = line.match(/Código\s+da\s+Receita[:\s]+(\d{4})/i);
    if (codigoMatch) {
      result.codigo_receita = codigoMatch[1];
    }
    
    // Extract reference number
    const referenciaMatch = line.match(/Número\s+de\s+Referência[:\s]+(\d+)/i);
    if (referenciaMatch) {
      result.numero_referencia = referenciaMatch[1];
    }
    
    // Extract values
    const valorPrincipalMatch = line.match(/Valor\s+do\s+Principal[:\s]+([\d.,]+)/i);
    if (valorPrincipalMatch) {
      result.valor_principal = parseBrCurrency(valorPrincipalMatch[1]);
    }
    
    const valorMultaMatch = line.match(/Valor\s+da\s+Multa[:\s]+([\d.,]+)/i);
    if (valorMultaMatch) {
      result.valor_multa = parseBrCurrency(valorMultaMatch[1]);
    }
    
    const valorJurosMatch = line.match(/Valor\s+dos\s+Juros[:\s]+([\d.,]+)/i);
    if (valorJurosMatch) {
      result.valor_juros = parseBrCurrency(valorJurosMatch[1]);
    }
    
    const valorTotalMatch = line.match(/Valor\s+Total[:\s]+([\d.,]+)/i);
    if (valorTotalMatch) {
      result.valor_total = parseBrCurrency(valorTotalMatch[1]);
    }
  }
  
  // Calculate total if not found
  if (!result.valor_total && result.valor_principal) {
    result.valor_total = result.valor_principal + result.valor_multa + result.valor_juros;
  }
  
  return result;
}

// Main handler
exports.handler = async (event, context) => {
  // Enable CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };
  
  // Handle preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }
  
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }
  
  try {
    // Parse multipart form data
    const contentType = event.headers['content-type'] || event.headers['Content-Type'];
    
    if (!contentType || !contentType.includes('multipart/form-data')) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Content-Type must be multipart/form-data' })
      };
    }
    
    // Decode base64 body
    const buffer = Buffer.from(event.body, event.isBase64Encoded ? 'base64' : 'utf8');
    
    // Extract boundary from content-type
    const boundary = contentType.split('boundary=')[1];
    if (!boundary) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'No boundary found in Content-Type' })
      };
    }
    
    // Parse multipart data manually
    const parts = buffer.toString('binary').split(`--${boundary}`);
    let pdfBuffer = null;
    
    for (const part of parts) {
      if (part.includes('Content-Disposition: form-data') && part.includes('filename=')) {
        // Extract the file content
        const contentStart = part.indexOf('\r\n\r\n') + 4;
        const contentEnd = part.lastIndexOf('\r\n');
        if (contentStart > 3 && contentEnd > contentStart) {
          pdfBuffer = Buffer.from(part.substring(contentStart, contentEnd), 'binary');
          break;
        }
      }
    }
    
    if (!pdfBuffer) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'No PDF file found in request' })
      };
    }
    
    console.log(`Processing PDF with ${pdfBuffer.length} bytes`);
    
    // Extract text from PDF
    const data = await pdf(pdfBuffer);
    const text = data.text;
    
    if (!text) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'No text extracted from PDF' })
      };
    }
    
    console.log(`Extracted ${text.length} characters from PDF`);
    
    // Preprocess text
    const processedText = preprocessText(text);
    
    // Check if it's a DARF document
    const isDarf = text.includes("DOCUMENTO DE ARRECADAÇÃO") || 
                   text.includes("DARF") ||
                   text.includes("Documento de Arrecadação de Receitas Federais");
    
    if (isDarf) {
      // Extract DARF data
      const darfData = extractDarfData(processedText);
      
      return {
        statusCode: 200,
        headers: {
          ...headers,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          success: true,
          type: 'darf',
          data: darfData,
          raw_text: processedText
        })
      };
    } else {
      // Extract fiscal report data
      const pendenciasDebito = extractPendenciasDebito(processedText);
      const debitosExigSuspensa = extractDebitosExigSuspensaSief(processedText);
      const parcelamentosSiefpar = extractParcelamentosSiefpar(processedText);
      const pendenciasInscricao = extractPendenciasInscricaoSida(processedText);
      const pendenciasParcelamento = extractPendenciasParcelamentoSispar(processedText);
      
      const extractedData = {
        pendencias_debito: pendenciasDebito,
        debitos_exig_suspensa: debitosExigSuspensa,
        parcelamentos_siefpar: parcelamentosSiefpar,
        pendencias_inscricao: pendenciasInscricao,
        pendencias_parcelamento: pendenciasParcelamento
      };
      
      console.log('Extraction summary:', {
        pendencias_debito: pendenciasDebito.length,
        debitos_exig_suspensa: debitosExigSuspensa.length,
        parcelamentos_siefpar: parcelamentosSiefpar.length,
        pendencias_inscricao: pendenciasInscricao.length,
        pendencias_parcelamento: pendenciasParcelamento.length
      });
      
      return {
        statusCode: 200,
        headers: {
          ...headers,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          success: true,
          type: 'fiscal_report',
          data: extractedData,
          raw_text: processedText
        })
      };
    }
  } catch (error) {
    console.error('Error processing PDF:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to process PDF',
        details: error.message
      })
    };
  }
}; 