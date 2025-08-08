import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import forge from 'npm:node-forge@1.3.1'; // Use npm specifier for Deno

// Helper function to convert ArrayBuffer to Base64
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// Helper function to convert Base64 to ArrayBuffer
function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary_string = atob(base64);
  const len = binary_string.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary_string.charCodeAt(i);
  }
  return bytes.buffer;
}

// Função para extrair informações específicas do certificado
function extractCertificateInfo(cert: any) {
  const info: any = {};
  
  // Log completo do certificado para debug
  console.log('Full certificate:', JSON.stringify(cert, null, 2));
  console.log('Certificate subject:', cert.subject);
  console.log('Certificate subject attributes:', cert.subject.attributes);

  // Extrair informações do subject
  cert.subject.attributes.forEach((attr: any) => {
    console.log('Processing attribute:', {
      type: attr.type,
      value: attr.value,
      name: attr.name,
      shortName: attr.shortName
    });

    // Mapeamento direto dos atributos comuns
    switch (attr.shortName) {
      case 'CN':
        info.razao_social = attr.value;
        break;
      case 'O':
        info.razao_social = attr.value;
        break;
      case 'OU':
        info.nome_fantasia = attr.value;
        break;
      case 'L':
        info.cidade = attr.value;
        break;
      case 'ST':
        info.estado = attr.value;
        break;
      case 'street':
        info.endereco = attr.value;
        break;
      case 'postalCode':
        info.cep = attr.value.replace(/[^\d]/g, '');
        break;
    }

    // Verificar se é um atributo específico do ICP-Brasil
    if (attr.type === '2.16.76.1.3.3') {
      info.cnpj = attr.value.replace(/[^\d]/g, '');
    }
  });

  // Log final para debug
  console.log('Extracted certificate info:', info);

  return info;
}

serve(async (req: Request) => {
  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*', // Adjust in production
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    });
  }

  try {
    const { pfxBase64, password } = await req.json();

    if (!pfxBase64 || !password) {
      return new Response(JSON.stringify({ error: 'Missing pfxBase64 or password' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    }

    const pfxBuffer = base64ToArrayBuffer(pfxBase64);
    const p12Asn1 = forge.asn1.fromDer(new forge.util.ByteStringBuffer(pfxBuffer));
    const p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, false, password);

    // Find the certificate bag
    const certBags = p12.getBags({ bagType: forge.pki.oids.certBag });
    const certBag = certBags[forge.pki.oids.certBag]?.[0]; // Assuming the first cert bag is the one we need

    if (!certBag || !certBag.cert) {
      throw new Error('Certificate not found in PFX file.');
    }

    const cert = certBag.cert;
    const expirationDate = cert.validity.notAfter;
    const now = new Date();
    const isValid = expirationDate > now;

    // Extrair informações do certificado
    const certificateInfo = extractCertificateInfo(cert);

    // Log para debug
    console.log('Sending response with certificate info:', certificateInfo);

    return new Response(
      JSON.stringify({
        isValid: isValid,
        expirationDate: expirationDate.toISOString(),
        subject: cert.subject.attributes.map(attr => `${attr.shortName}=${attr.value}`).join(', '),
        issuer: cert.issuer.attributes.map(attr => `${attr.shortName}=${attr.value}`).join(', '),
        certificateInfo: certificateInfo
      }),
      {
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Certificate validation error:', error);
    // Check if the error is likely due to incorrect password
    const errorMessage = error instanceof Error ? error.message : String(error);
    const isPasswordError = errorMessage.includes('MAC') || errorMessage.includes('password');

    return new Response(
      JSON.stringify({
        error: isPasswordError ? 'Senha do certificado inválida.' : 'Erro ao processar o certificado.',
        details: errorMessage, // Include original error for debugging if needed
      }),
      {
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        status: isPasswordError ? 400 : 500, // Bad request for password error, internal for others
      }
    );
  }
});
