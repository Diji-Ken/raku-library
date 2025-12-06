import { ChevronLeft, ChevronRight, CheckSquare, Square, Trash2 } from 'lucide-react';
import BookCard from './BookCard';
import type { DocumentNode, TreeNode, Breadcrumb } from '../types';

interface BookshelfViewProps {
  folders?: TreeNode[];
  onBookClick: (doc: DocumentNode) => void;
  currentCabinetName?: string;
  onBackClick?: () => void;
  breadcrumbs?: Breadcrumb[];
  onBreadcrumbClick?: (index: number) => void;
  isSelectionMode?: boolean;
  selectedDocumentIds?: Set<string>;
  onToggleDocumentSelection?: (documentId: string) => void;
  onToggleSelectionMode?: () => void;
  onSelectAll?: () => void;
  onDeselectAll?: () => void;
  onBulkDelete?: () => void;
}

const BookshelfView: React.FC<BookshelfViewProps> = ({
  folders = [],
  onBookClick,
  currentCabinetName = 'ドキュメント一覧',
  onBackClick,
  breadcrumbs = [],
  onBreadcrumbClick,
  isSelectionMode = false,
  selectedDocumentIds = new Set(),
  onToggleDocumentSelection,
  onToggleSelectionMode,
  onSelectAll,
  onDeselectAll,
  onBulkDelete
}) => {
  // 1行あたりの本の数
  const booksPerShelf = 20;

  return (
    <div className="bookshelf-container">
      {/* ヘッダーエリア：戻るボタン + パンくずリスト */}
      <div style={{
        padding: '16px 40px',
        borderBottom: '1px solid #e5e7eb',
        backgroundColor: 'white',
        position: 'relative',
        zIndex: 10,
        display: 'flex',
        alignItems: 'center',
        gap: '16px'
      }}>
        {/* 戻るボタン */}
        {onBackClick && (
          <button
            onClick={onBackClick}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 16px',
              background: 'white',
              border: '2px solid #e5e7eb',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500',
              color: '#374151',
              transition: 'all 0.2s',
              flexShrink: 0
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#f9fafb';
              e.currentTarget.style.borderColor = '#667eea';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'white';
              e.currentTarget.style.borderColor = '#e5e7eb';
            }}
          >
            <ChevronLeft style={{ width: '16px', height: '16px' }} />
            戻る
          </button>
        )}

        {/* パンくずナビゲーション */}
        {breadcrumbs && breadcrumbs.length > 0 && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 16px',
            backgroundColor: 'rgba(102, 126, 234, 0.05)',
            borderRadius: '8px',
            border: '1px solid rgba(102, 126, 234, 0.2)',
            flex: 1
          }}>
            {breadcrumbs.map((crumb, index) => {
              const isLast = index === breadcrumbs.length - 1;
              return (
                <div key={index} style={{ display: 'contents' }}>
                  <button
                    onClick={() => {
                      if (!isLast && onBreadcrumbClick) {
                        onBreadcrumbClick(index);
                      }
                    }}
                    style={{
                      color: isLast ? '#1a202c' : '#667eea',
                      fontWeight: isLast ? '600' : '500',
                      fontSize: '14px',
                      background: 'none',
                      border: 'none',
                      cursor: isLast ? 'default' : 'pointer',
                      padding: '4px 8px',
                      borderRadius: '6px',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      if (!isLast) {
                        e.currentTarget.style.backgroundColor = '#ede9fe';
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                  >
                    {crumb.name}
                  </button>
                  {!isLast && (
                    <ChevronRight style={{ width: '16px', height: '16px', color: '#cbd5e1' }} />
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* 選択モード切り替えボタン */}
        {onToggleSelectionMode && (
          <button
            onClick={onToggleSelectionMode}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 16px',
              background: isSelectionMode ? '#667eea' : 'white',
              border: `2px solid ${isSelectionMode ? '#667eea' : '#e5e7eb'}`,
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '600',
              color: isSelectionMode ? 'white' : '#374151',
              transition: 'all 0.2s',
              flexShrink: 0
            }}
            onMouseEnter={(e) => {
              if (!isSelectionMode) {
                e.currentTarget.style.backgroundColor = '#f9fafb';
                e.currentTarget.style.borderColor = '#667eea';
              }
            }}
            onMouseLeave={(e) => {
              if (!isSelectionMode) {
                e.currentTarget.style.backgroundColor = 'white';
                e.currentTarget.style.borderColor = '#e5e7eb';
              }
            }}
          >
            {isSelectionMode ? (
              <>
                <CheckSquare style={{ width: '16px', height: '16px' }} />
                選択中
              </>
            ) : (
              <>
                <Square style={{ width: '16px', height: '16px' }} />
                選択
              </>
            )}
          </button>
        )}
      </div>

      {/* 一括操作ツールバー */}
      {isSelectionMode && selectedDocumentIds.size > 0 && (
        <div style={{
          padding: '12px 40px',
          backgroundColor: '#f3f4f6',
          borderBottom: '1px solid #e5e7eb',
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <span style={{
            fontSize: '14px',
            fontWeight: '600',
            color: '#374151'
          }}>
            {selectedDocumentIds.size}個選択中
          </span>

          {onSelectAll && (
            <button
              onClick={onSelectAll}
              style={{
                padding: '6px 12px',
                background: 'white',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: '500',
                color: '#374151',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#f9fafb';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'white';
              }}
            >
              すべて選択
            </button>
          )}

          {onDeselectAll && (
            <button
              onClick={onDeselectAll}
              style={{
                padding: '6px 12px',
                background: 'white',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: '500',
                color: '#374151',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#f9fafb';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'white';
              }}
            >
              選択解除
            </button>
          )}

          <div style={{ flex: 1 }} />

          {onBulkDelete && (
            <button
              onClick={onBulkDelete}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 16px',
                background: '#ef4444',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '600',
                color: 'white',
                transition: 'all 0.2s',
                boxShadow: '0 2px 4px rgba(239, 68, 68, 0.2)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#dc2626';
                e.currentTarget.style.transform = 'translateY(-1px)';
                e.currentTarget.style.boxShadow = '0 4px 8px rgba(239, 68, 68, 0.3)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#ef4444';
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 2px 4px rgba(239, 68, 68, 0.2)';
              }}
            >
              <Trash2 style={{ width: '16px', height: '16px' }} />
              削除 ({selectedDocumentIds.size})
            </button>
          )}
        </div>
      )}

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
                              isSelectionMode={isSelectionMode}
                              isSelected={selectedDocumentIds.has(doc.id)}
                              onToggleSelection={() => onToggleDocumentSelection?.(doc.id)}
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
