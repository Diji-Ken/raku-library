import { ChevronLeft } from 'lucide-react';
import BookCard from './BookCard';
import type { DocumentNode, TreeNode } from '../types';

interface BookshelfViewProps {
  folders?: TreeNode[];
  onBookClick: (doc: DocumentNode) => void;
  currentCabinetName?: string;
  onBackClick?: () => void;
}

const BookshelfView: React.FC<BookshelfViewProps> = ({
  folders = [],
  onBookClick,
  currentCabinetName = 'ドキュメント一覧',
  onBackClick
}) => {
  // 1行あたりの本の数
  const booksPerShelf = 20;

  return (
    <div className="bookshelf-container">
      <div className="bookshelf-header">
        {onBackClick && (
          <button
            onClick={onBackClick}
            style={{
              position: 'absolute',
              left: '30px',
              top: '32px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              backgroundColor: 'rgba(255, 255, 255, 0.95)',
              color: '#667eea',
              border: '2px solid #667eea',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              boxShadow: '0 2px 8px rgba(102, 126, 234, 0.2)',
              zIndex: 10
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#667eea';
              e.currentTarget.style.color = 'white';
              e.currentTarget.style.transform = 'translateX(-4px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.95)';
              e.currentTarget.style.color = '#667eea';
              e.currentTarget.style.transform = 'translateX(0)';
            }}
          >
            <ChevronLeft size={16} />
            戻る
          </button>
        )}
        <h2 className="bookshelf-title">{currentCabinetName}</h2>
      </div>

      {folders.length === 0 ? (
        <div className="bookshelf-empty">
          <p>このキャビネットにはフォルダがありません</p>
          <p className="bookshelf-empty-hint">フォルダを作成して始めましょう</p>
        </div>
      ) : (
        <div className="cabinet-sections">
          {folders.map((folder) => {
            const folderDocuments = (folder.children?.filter(child => child.type === 'document') as DocumentNode[]) || [];

            // フォルダ内の本を棚ごとにグループ化
            const folderShelves: DocumentNode[][] = [];
            for (let i = 0; i < folderDocuments.length; i += booksPerShelf) {
              folderShelves.push(folderDocuments.slice(i, i + booksPerShelf));
            }

            return (
              <div key={folder.id} className="folder-section">
                <div className="folder-section-header">
                  <h3 className="folder-section-title">{folder.name}</h3>
                  <span className="folder-section-count">{folderDocuments.length}冊</span>
                </div>

                {folderDocuments.length === 0 ? (
                  <div className="folder-section-empty">
                    このフォルダにはドキュメントがありません
                  </div>
                ) : (
                  <div className="folder-shelves">
                    {folderShelves.map((shelfBooks, shelfIndex) => (
                      <div key={shelfIndex} className="shelf-row">
                        <div className="shelf-books">
                          {shelfBooks.map(doc => (
                            <BookCard
                              key={doc.id}
                              document={doc}
                              onClick={() => onBookClick(doc)}
                            />
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default BookshelfView;
