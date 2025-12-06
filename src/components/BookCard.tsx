import { useState, useEffect } from 'react';
import { Book, Check } from 'lucide-react';
import { Document } from 'react-pdf';
import type { DocumentNode } from '../types';

interface BookCardProps {
  document: DocumentNode;
  onClick: () => void;
  isSelectionMode?: boolean;
  isSelected?: boolean;
  onToggleSelection?: () => void;
}

const BookCard: React.FC<BookCardProps> = ({
  document,
  onClick,
  isSelectionMode = false,
  isSelected = false,
  onToggleSelection
}) => {
  const [pdfPageCount, setPdfPageCount] = useState<number | null>(null);
  const isPDF = !!(document.originalFile || document.pdfUrl);
  const getBookColor = (color?: string) => {
    const colorMap: Record<string, string> = {
      blue: '#3b82f6',
      green: '#10b981',
      red: '#ef4444',
      yellow: '#f59e0b',
      purple: '#8b5cf6',
    };
    return colorMap[color || 'blue'] || colorMap.blue;
  };

  const getDocumentTypeLabel = (name: string) => {
    if (name.includes('履歴書') || name.includes('resume')) return '履歴書';
    if (name.includes('職務経歴') || name.includes('cv')) return '職務経歴書';
    if (name.includes('面接') || name.includes('interview')) return '面接記録';
    if (name.includes('評価') || name.includes('evaluation')) return '評価シート';
    return 'ドキュメント';
  };

  const bookColor = getBookColor(document.color);
  const documentType = getDocumentTypeLabel(document.name);
  // PDFの場合はpdfPageCount（動的取得）またはnumPages、それ以外はpages配列の長さ
  const pageCount = pdfPageCount || document.numPages || document.pages?.length || 0;

  const handleClick = () => {
    if (isSelectionMode && onToggleSelection) {
      onToggleSelection();
    } else {
      onClick();
    }
  };

  // PDFのページ数を取得するための非表示Document
  let pdfSource = null;
  if (isPDF) {
    pdfSource = document.originalFile;
    if (!pdfSource && document.pdfUrl) {
      // URLの各部分をencodeする（/files/の部分は除く）
      const parts = document.pdfUrl.split('/');
      const encodedParts = parts.map((part, index) =>
        index < parts.length - 1 ? part : encodeURIComponent(part)
      );
      pdfSource = encodedParts.join('/');
    }
  }

  return (
    <>
      <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
        <div
          className="book-card"
          onClick={handleClick}
          style={{
            cursor: 'pointer',
            opacity: isSelected ? 0.8 : 1,
            transition: 'opacity 0.2s',
            border: isSelected ? '2px solid #667eea' : undefined
          }}
        >
          <div className="book-title-vertical">
            {document.name}
          </div>
          <div className="book-spine-bottom">
            <span style={{ display: 'block', position: 'relative', paddingTop: '0.6em' }}>
              <span style={{
                position: 'absolute',
                content: '・',
                left: '50%',
                transform: 'translateX(-50%)',
                top: '-0.4em'
              }}>・</span>
              {pageCount}p
            </span>
          </div>
        </div>

        {/* 選択モード時のチェックボックス - 本の下に配置 */}
        {isSelectionMode && (
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              backgroundColor: isSelected ? '#667eea' : '#ffffff',
              border: `2px solid ${isSelected ? '#667eea' : '#d1d5db'}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
            onClick={(e) => {
              e.stopPropagation();
              if (onToggleSelection) {
                onToggleSelection();
              }
            }}
            onMouseEnter={(e) => {
              if (!isSelected) {
                e.currentTarget.style.borderColor = '#667eea';
                e.currentTarget.style.transform = 'scale(1.1)';
              }
            }}
            onMouseLeave={(e) => {
              if (!isSelected) {
                e.currentTarget.style.borderColor = '#d1d5db';
                e.currentTarget.style.transform = 'scale(1)';
              }
            }}
          >
            {isSelected && <Check style={{ width: '20px', height: '20px', color: 'white', strokeWidth: 3 }} />}
          </div>
        )}
      </div>

      {/* PDFのページ数を取得するための非表示Document */}
      {isPDF && pdfSource && (
        <div style={{ display: 'none' }}>
          <Document
            file={pdfSource}
            onLoadSuccess={({ numPages }) => {
              setPdfPageCount(numPages);
            }}
            onLoadError={(error) => {
              console.error('PDF page count load error:', error);
            }}
          />
        </div>
      )}
    </>
  );
};

export default BookCard;
