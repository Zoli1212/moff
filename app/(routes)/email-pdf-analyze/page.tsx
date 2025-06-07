// app/pdf-analyze/page.tsx
export default async function PDFAnalyzePage({ searchParams }: { searchParams: { token: string } }) {
    const accessToken = searchParams.token;
    const messageId = 'A_VALID_GMAIL_MESSAGE_ID'; // később dinamikus is lehet
  
    const res = await fetch(`http://localhost:3000/api/emails/${messageId}/analyze?token=${accessToken}`);
    const { filename, content } = await res.json();
  
    return (
      <div className="p-10">
        <h1 className="text-xl font-bold mb-4">📧 E-mail + 📄 {filename}</h1>
        <pre className="bg-gray-100 p-4 rounded text-sm whitespace-pre-wrap max-h-[80vh] overflow-auto">
          {content}
        </pre>
      </div>
    );
  }
  