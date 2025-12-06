import { Book } from 'lucide-react';
import type { DocumentNode } from '../types';

interface BookCardProps {
  document: DocumentNode;
  onClick: () => void;
}

const BookCard: React.FC<BookCardProps> = ({ document, onClick }) => {
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
  const pageCount = document.pages?.length || 0;

  return (
    <div className="book-card" onClick={onClick}>
      <div className="book-title-vertical">{document.name}</div>
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
  );
};

export default BookCard;
