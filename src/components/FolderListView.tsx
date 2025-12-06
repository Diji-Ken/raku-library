import { Folder, FolderOpen, ChevronLeft } from 'lucide-react';
import type { TreeNode } from '../types';

interface FolderListViewProps {
  items: TreeNode[];
  onItemClick: (item: TreeNode) => void;
  title?: string;
  itemType?: 'cabinet' | 'folder';
  onBackClick?: () => void;
}

const FolderListView: React.FC<FolderListViewProps> = ({
  items,
  onItemClick,
  title = '楽々ライブラリ',
  itemType = 'folder',
  onBackClick
}) => {
  const getItemCount = (item: TreeNode) => {
    if (itemType === 'cabinet') {
      // キャビネットの場合、中のフォルダー数を表示
      return item.children?.filter(child => child.type === 'folder').length || 0;
    } else {
      // フォルダーの場合、中のドキュメント数を表示
      return item.children?.filter(child => child.type === 'document').length || 0;
    }
  };

  const getCountLabel = (count: number) => {
    if (itemType === 'cabinet') {
      return `${count}個のフォルダ`;
    } else {
      return `${count}個のドキュメント`;
    }
  };

  const getFolderColor = (index: number) => {
    const colors = [
      '#667eea', // purple
      '#f59e0b', // orange
      '#10b981', // green
      '#ef4444', // red
      '#8b5cf6', // violet
      '#ec4899', // pink
      '#14b8a6', // teal
      '#f97316', // deep orange
    ];
    return colors[index % colors.length];
  };

  const getItemTypeLabel = (item: TreeNode) => {
    if (itemType === 'cabinet') {
      return 'キャビネット';
    } else {
      return 'フォルダ';
    }
  };

  return (
    <div className="bookshelf-container">
      {onBackClick && (
        <button
          onClick={onBackClick}
          style={{
            position: 'absolute',
            top: '40px',
            left: '40px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '12px 24px',
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            color: '#6366f1',
            border: '2px solid #6366f1',
            borderRadius: '12px',
            fontSize: '16px',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            boxShadow: '0 4px 12px rgba(99, 102, 241, 0.2)',
            zIndex: 10
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#6366f1';
            e.currentTarget.style.color = 'white';
            e.currentTarget.style.transform = 'translateX(-4px)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.95)';
            e.currentTarget.style.color = '#6366f1';
            e.currentTarget.style.transform = 'translateX(0)';
          }}
        >
          <ChevronLeft size={20} />
          戻る
        </button>
      )}
      <div className="bookshelf-header">
        <h2 className="bookshelf-title">{title}</h2>
        <p className="bookshelf-count">
          {items.length}個の{itemType === 'cabinet' ? 'キャビネット' : 'フォルダ'}
        </p>
      </div>

      {items.length === 0 ? (
        <div className="bookshelf-empty">
          <p>{itemType === 'cabinet' ? 'キャビネット' : 'フォルダ'}がありません</p>
          <p className="bookshelf-empty-hint">作成して始めましょう</p>
        </div>
      ) : (
        <div className="folder-grid">
          {items.map((item, index) => (
            <div
              key={item.id}
              className="folder-card"
              style={{ '--folder-color': getFolderColor(index) } as React.CSSProperties}
              onClick={() => onItemClick(item)}
            >
              <div className="folder-icon">
                {itemType === 'cabinet' ? <FolderOpen /> : <Folder />}
              </div>
              <div className="folder-content">
                <div className="folder-title" style={{ writingMode: 'vertical-rl', textOrientation: 'mixed', fontSize: '14px', letterSpacing: '0.3em', lineHeight: '1.8em', margin: '0 auto' }}>
                  {item.name}
                </div>
                <div className="folder-divider" style={{ marginTop: '20px' }} />
                <div className="folder-count" style={{ marginTop: '12px', textAlign: 'center' }}>
                  {getCountLabel(getItemCount(item))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default FolderListView;
