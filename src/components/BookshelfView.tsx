import { ChevronLeft, ChevronRight, CheckSquare, Square, Trash2, Edit3 } from 'lucide-react';
import BookCard from './BookCard';
import type { DocumentNode, TreeNode } from '../types';

interface BookshelfViewProps {
  folders?: TreeNode[];
  onBookClick: (doc: DocumentNode) => void;
  onFolderClick?: (folder: TreeNode) => void;
  currentCabinetName?: string;
  onBackClick?: () => void;
  isSelectionMode?: boolean;
  selectedDocumentIds?: Set<string>;
  onToggleDocumentSelection?: (documentId: string) => void;
  onToggleSelectionMode?: () => void;
  onSelectAll?: () => void;
  onDeselectAll?: () => void;
  onBulkDelete?: () => void;
  onRename?: (documentId: string) => void;
}

const BookshelfView: React.FC<BookshelfViewProps> = ({
  folders = [],
  onBookClick,
  onFolderClick,
  currentCabinetName = 'ドキュメント一覧',
  onBackClick,
  isSelectionMode = false,
  selectedDocumentIds = new Set(),
  onToggleDocumentSelection,
  onToggleSelectionMode,
  onSelectAll,
  onDeselectAll,
  onBulkDelete,
  onRename
}) => {
  // 1行あたりの本の数
  const booksPerShelf = 10;

  return (
    <div className="bookshelf-container">
      {/* ヘッダーエリア */}
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

        <div style={{ flex: 1 }} />

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

          {/* 名称変更ボタン（1つだけ選択されている場合のみ表示） */}
          {onRename && selectedDocumentIds.size === 1 && (
            <button
              onClick={() => {
                const documentId = Array.from(selectedDocumentIds)[0];
                onRename(documentId);
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
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
              <Edit3 style={{ width: '14px', height: '14px' }} />
              名称変更
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
        <div className="cabinet-sections" style={{
          backgroundColor: '#f9fafb',
          minHeight: 'calc(100vh - 200px)',
          padding: '40px'
        }}>
          {folders.map((folder) => {
            const children = 'children' in folder ? folder.children : [];
            // 本棚にはバインダ（document）のみを表示
            const folderDocuments = (children?.filter((child: any) => child.type === 'document') as DocumentNode[]) || [];

            // バインダを棚ごとにグループ化
            const folderShelves: DocumentNode[][] = [];
            for (let i = 0; i < folderDocuments.length; i += booksPerShelf) {
              folderShelves.push(folderDocuments.slice(i, i + booksPerShelf));
            }

            return (
              <div key={folder.id} className="folder-section">
                {folderDocuments.length === 0 ? (
                  <div className="folder-section-empty">
                    このフォルダには何もありません
                  </div>
                ) : (
                  <div className="folder-shelves">
                    {folderShelves.map((shelfItems, shelfIndex) => (
                      <div key={shelfIndex} className="shelf-box">
                        <div className="shelf-books">
                          {shelfItems.map(doc => (
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
