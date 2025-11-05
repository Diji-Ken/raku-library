import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronLeft, ChevronRight, ChevronDown, Folder, FolderOpen, File, Image, FileText, Video, X, Search, Upload, Download, Book, Plus, FolderPlus, Trash2, Printer } from 'lucide-react';
import { Document, Page, pdfjs } from 'react-pdf';
import mammoth from 'mammoth';
import * as XLSX from 'xlsx';
// react-pdf の Annotation/Text レイヤーは無効化しているため、CSSのインポートは不要です。
// （renderTextLayer={false}、renderAnnotationLayer={false}）

// PDF.js worker設定 - node_modulesから直接ロード
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString();

// スタイル定義 - 楽々ライブラリ風デザイン
const styles = `
  .library-container {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    min-height: 100vh;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif;
  }

  .library-header {
    background: rgba(255, 255, 255, 0.95);
    backdrop-filter: blur(10px);
    color: #1a202c;
    padding: 20px 30px;
    box-shadow: 0 4px 20px rgba(0,0,0,0.08);
    border-bottom: 1px solid rgba(0,0,0,0.05);
  }
  
  .library-title {
    font-size: 28px;
    font-weight: 800;
    margin: 0;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  .library-main {
    display: flex;
    height: calc(100vh - 80px);
    gap: 0;
  }

  .sidebar {
    width: 320px;
    background: rgba(255, 255, 255, 0.95);
    backdrop-filter: blur(10px);
    border-right: 1px solid rgba(0,0,0,0.05);
    box-shadow: 4px 0 20px rgba(0,0,0,0.08);
    overflow-y: auto;
  }

  .sidebar-header {
    background: transparent;
    color: #1a202c;
    padding: 20px;
    border-bottom: 1px solid rgba(0,0,0,0.05);
  }
  
  .search-container {
    position: relative;
    margin-bottom: 15px;
  }
  
  .search-input {
    width: 100%;
    padding: 12px 40px 12px 16px;
    border: 2px solid rgba(0,0,0,0.08);
    border-radius: 12px;
    font-size: 14px;
    background: white;
    transition: all 0.3s ease;
  }

  .search-input:focus {
    outline: none;
    border-color: #667eea;
    box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
  }

  .search-icon {
    position: absolute;
    right: 15px;
    top: 50%;
    transform: translateY(-50%);
    color: #a0aec0;
  }
  
  .cabinet {
    margin: 10px;
    background: white;
    border-radius: 12px;
    box-shadow: 0 2px 12px rgba(0,0,0,0.06);
    border: 1px solid rgba(0,0,0,0.05);
    overflow: hidden;
  }

  .cabinet-header {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    padding: 14px 16px;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 10px;
    font-weight: 700;
    transition: all 0.3s ease;
  }

  .cabinet-header:hover {
    background: linear-gradient(135deg, #5568d3 0%, #6a3f8f 100%);
  }

  .folder {
    margin: 8px 12px;
    background: white;
    border-radius: 10px;
    border: 1px solid rgba(0,0,0,0.08);
    overflow: hidden;
    transition: all 0.3s ease;
  }

  .folder:hover {
    box-shadow: 0 4px 12px rgba(0,0,0,0.08);
  }

  .folder-header {
    background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
    color: white;
    padding: 12px 14px;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 8px;
    font-weight: 600;
    transition: all 0.3s ease;
  }

  .folder-header:hover {
    background: linear-gradient(135deg, #e082ea 0%, #e4465b 100%);
  }
  
  .document-item {
    padding: 10px 16px;
    margin: 2px 8px;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 10px;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    border-radius: 8px;
    background: transparent;
  }

  .document-item:hover {
    background: linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%);
    transform: translateX(4px);
    padding-left: 20px;
  }

  .document-item:last-child {
    margin-bottom: 8px;
  }
  
  .document-spine {
    width: 20px;
    height: 20px;
    border-radius: 2px;
    box-shadow: inset -2px 0 4px rgba(0,0,0,0.2), 2px 2px 4px rgba(0,0,0,0.1);
    border: 1px solid rgba(0,0,0,0.1);
  }
  
  .content-area {
    flex: 1;
    background: rgba(255, 255, 255, 0.4);
    backdrop-filter: blur(10px);
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .content-header {
    background: rgba(255, 255, 255, 0.8);
    backdrop-filter: blur(10px);
    padding: 30px;
    border-bottom: 1px solid rgba(0,0,0,0.05);
    box-shadow: 0 2px 10px rgba(0,0,0,0.03);
  }
  
  .toolbar {
    display: flex;
    gap: 10px;
    margin-bottom: 15px;
  }
  
  .toolbar-button {
    padding: 10px 20px;
    background: white;
    border: 1px solid rgba(0,0,0,0.08);
    border-radius: 12px;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 14px;
    font-weight: 600;
    transition: all 0.3s ease;
    box-shadow: 0 2px 8px rgba(0,0,0,0.04);
    color: #2d3748;
  }

  .toolbar-button:hover {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    transform: translateY(-2px);
    box-shadow: 0 8px 20px rgba(102, 126, 234, 0.3);
    border-color: transparent;
  }
  
  .document-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 20px;
    padding: 20px;
    overflow-y: auto;
  }
  
  .document-card {
    background: white;
    border-radius: 16px;
    padding: 16px;
    box-shadow: 0 4px 20px rgba(0,0,0,0.08);
    cursor: pointer;
    transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
    border: 1px solid rgba(0,0,0,0.05);
    position: relative;
    overflow: hidden;
  }

  .document-card:hover {
    transform: translateY(-8px) scale(1.03);
    box-shadow: 0 20px 40px rgba(102, 126, 234, 0.2);
  }

  .document-card::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    width: 4px;
    height: 100%;
    background: var(--doc-color, #667eea);
    border-radius: 16px 0 0 16px;
  }

  .document-card::after {
    content: '';
    position: absolute;
    top: -50%;
    right: -50%;
    width: 200%;
    height: 200%;
    background: linear-gradient(135deg, transparent, rgba(102, 126, 234, 0.05), transparent);
    transform: rotate(45deg);
    transition: all 0.5s ease;
    opacity: 0;
    pointer-events: none;
    z-index: 1;
  }

  .document-card:hover::after {
    opacity: 1;
    animation: shimmer 2s infinite;
  }

  @keyframes shimmer {
    0% { transform: translateX(-100%) translateY(-100%) rotate(45deg); }
    100% { transform: translateX(100%) translateY(100%) rotate(45deg); }
  }

  @keyframes pulse {
    0%, 100% {
      transform: scale(1);
      opacity: 1;
    }
    50% {
      transform: scale(1.05);
      opacity: 0.9;
    }
  }

  /* Excel/Word用のテーブルスタイル */
  table {
    border-collapse: collapse;
    width: 100%;
    margin: 16px 0;
    font-size: 14px;
  }

  table th {
    background-color: #667eea;
    color: white;
    padding: 12px;
    text-align: left;
    font-weight: 600;
    border: 1px solid #ddd;
  }

  table td {
    padding: 10px 12px;
    border: 1px solid #ddd;
    color: #1f2937;
  }

  table tr:nth-child(even) {
    background-color: #f9fafb;
  }

  table tr:hover {
    background-color: #f3f4f6;
  }

  .document-card > * {
    position: relative;
    z-index: 2;
  }
  
  .document-title {
    font-weight: bold;
    font-size: 16px;
    margin-bottom: 8px;
    color: #2c3e50;
    margin-left: 15px;
  }
  
  .document-pages {
    font-size: 12px;
    color: #7f8c8d;
    margin-left: 15px;
  }
  
  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.8);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    backdrop-filter: blur(5px);
  }
  
  .modal-content {
    background: linear-gradient(145deg, #ffffff, #f8f9fa);
    border-radius: 15px;
    max-width: 90vw;
    max-height: 90vh;
    overflow: hidden;
    box-shadow: 0 20px 60px rgba(0,0,0,0.3);
    border: 2px solid #e9ecef;
  }
  
  .modal-header {
    background: linear-gradient(90deg, #2c3e50 0%, #34495e 100%);
    color: white;
    padding: 15px 20px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 2px solid #3498db;
  }
  
  .modal-title {
    font-size: 18px;
    font-weight: bold;
    text-shadow: 1px 1px 2px rgba(0,0,0,0.3);
  }
  
  .close-button {
    background: none;
    border: none;
    color: white;
    cursor: pointer;
    padding: 5px;
    border-radius: 50%;
    transition: all 0.3s ease;
  }
  
  .close-button:hover {
    background: rgba(255,255,255,0.2);
    transform: scale(1.1);
  }
  
  .page-content {
    padding: 30px;
    min-height: 400px;
    background: white;
    font-size: 16px;
    line-height: 1.6;
    white-space: pre-wrap;
    color: #2c3e50;
  }
  
  .page-navigation {
    background: linear-gradient(90deg, #ecf0f1 0%, #bdc3c7 100%);
    padding: 15px 20px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-top: 2px solid #95a5a6;
  }
  
  .nav-button {
    background: linear-gradient(145deg, #3498db, #2980b9);
    color: white;
    border: none;
    padding: 10px 20px;
    border-radius: 25px;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 8px;
    font-weight: bold;
    transition: all 0.3s ease;
    box-shadow: 3px 3px 10px rgba(0,0,0,0.2);
  }
  
  .nav-button:hover {
    background: linear-gradient(145deg, #2980b9, #3498db);
    transform: translateY(-2px);
    box-shadow: 0 5px 15px rgba(52, 152, 219, 0.4);
  }
  
  .nav-button:disabled {
    background: #bdc3c7;
    cursor: not-allowed;
    transform: none;
    box-shadow: none;
  }
  
  .page-indicator {
    background: linear-gradient(145deg, #ffffff, #f8f9fa);
    padding: 8px 16px;
    border-radius: 20px;
    font-weight: bold;
    color: #2c3e50;
    box-shadow: inset 2px 2px 5px rgba(0,0,0,0.1);
    border: 1px solid #dee2e6;
  }
  
  @media (max-width: 768px) {
    .library-main {
      flex-direction: column;
      height: auto;
    }
    
    .sidebar {
      width: 100%;
      height: 300px;
    }
    
    .document-grid {
      grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
      gap: 15px;
      padding: 15px;
    }
    
    .modal-content {
      max-width: 95vw;
      max-height: 95vh;
    }
    
    .page-content {
      padding: 20px;
      font-size: 14px;
    }
  }
`;

// モックデータ - 楽々ライブラリ風の階層構造
const mockData = {
  name: 'マイライブラリ',
  children: [
    {
      id: 'cabinet1',
      name: '技術資料',
      type: 'cabinet',
      expanded: true,
      children: [
        {
          id: 'folder1-1',
          name: 'プログラミング',
          type: 'folder',
          expanded: false,
          children: [
            {
              id: 'd1',
              name: 'React入門ガイド',
              type: 'document',
              color: 'blue',
              pages: [
                { type: 'text', content: 'React入門ガイド\n\n第1章：はじめに\n\nReactは、ユーザーインターフェースを構築するためのJavaScriptライブラリです。Facebookによって開発され、現在では世界中で広く使用されています。\n\nコンポーネントベースのアーキテクチャにより、再利用可能なUIパーツを作成できます。' },
                { type: 'text', content: '第2章：コンポーネント\n\nReactの核心はコンポーネントです。コンポーネントは、UIを独立した再利用可能な部品に分割します。\n\n【コンポーネントの種類】\n・関数コンポーネント\n・クラスコンポーネント\n\nモダンなReact開発では、関数コンポーネントとHooksの使用が推奨されています。' },
                { type: 'text', content: '第3章：State と Props\n\nStateはコンポーネントの内部状態を管理します。Propsは親コンポーネントから子コンポーネントにデータを渡すために使用されます。\n\n【Stateの更新】\nuseState Hookを使用することで、関数コンポーネント内で状態管理が可能になります。' },
                { type: 'text', content: '第4章：Hooks\n\nReact Hooksは、関数コンポーネントで状態やライフサイクル機能を使用するための機能です。\n\n主なHooks:\n・useState\n・useEffect\n・useContext\n・useReducer\n・useCallback\n・useMemo' }
              ]
            },
            {
              id: 'd2',
              name: 'TypeScript基礎',
              type: 'document',
              color: 'purple',
              pages: [
                { type: 'text', content: 'TypeScript基礎\n\n目次\n1. TypeScriptとは\n2. 型システム\n3. インターフェース\n4. ジェネリクス\n5. デコレータ\n\nTypeScriptは、JavaScriptのスーパーセットです。' },
                { type: 'text', content: '1. TypeScriptとは\n\nTypeScriptは、JavaScriptに静的型付けを追加した言語です。Microsoftによって開発されました。\n\nコンパイル時に型チェックを行うことで、バグを事前に発見できます。' },
                { type: 'text', content: '2. 型システム\n\nTypeScriptの型システムは非常に強力です。\n\n基本型:\n・string\n・number\n・boolean\n・array\n・tuple\n・enum\n・any\n・void' }
              ]
            }
          ]
        },
        {
          id: 'folder1-2',
          name: 'デザイン',
          type: 'folder',
          expanded: false,
          children: [
            {
              id: 'd3',
              name: 'UI/UXガイドライン',
              type: 'document',
              color: 'green',
              pages: [
                { type: 'text', content: 'UI/UXガイドライン\n\n【基本原則】\n\n1. ユーザー中心設計\n2. 一貫性の維持\n3. フィードバックの提供\n4. エラー防止\n5. 柔軟性と効率性' },
                { type: 'text', content: 'カラーシステム\n\nプライマリカラー: #0066CC\nセカンダリカラー: #4CAF50\n背景色: #F5F5F5\nテキスト: #333333\n\nアクセシビリティを考慮したコントラスト比を確保してください。' }
              ]
            },
            {
              id: 'd3-1',
              name: 'ワイヤーフレーム',
              type: 'document',
              color: 'pink',
              pages: [
                { type: 'image', url: 'invalid-image-url.jpg' },
                { type: 'image', url: 'another-invalid-image.png' }
              ]
            }
          ]
        }
      ]
    },
    {
      id: 'cabinet2',
      name: 'プロジェクト資料',
      type: 'cabinet',
      expanded: false,
      children: [
        {
          id: 'folder2-1',
          name: '2024年度',
          type: 'folder',
          expanded: false,
          children: [
            {
              id: 'd4',
              name: 'UI設計書',
              type: 'document',
              color: 'orange',
              pages: [
                { type: 'image', url: 'https://via.placeholder.com/800x1000/4A90E2/FFFFFF?text=UI設計書+ページ1' },
                { type: 'image', url: 'https://via.placeholder.com/800x1000/7B68EE/FFFFFF?text=UI設計書+ページ2' },
                { type: 'image', url: 'https://via.placeholder.com/800x1000/50C878/FFFFFF?text=UI設計書+ページ3' }
              ]
            },
            {
              id: 'd5',
              name: 'プロジェクト計画書',
              type: 'document',
              color: 'red',
              pages: [
                { type: 'text', content: 'プロジェクト計画書\n\n【プロジェクト概要】\n\nプロジェクト名: 新システム開発\n期間: 2024年4月〜2024年12月\n予算: 500万円\n\n目的:\n既存システムの刷新とユーザビリティの向上' },
                { type: 'text', content: 'スケジュール\n\n第1フェーズ（4-6月）:\n・要件定義\n・基本設計\n\n第2フェーズ（7-9月）:\n・詳細設計\n・開発\n\n第3フェーズ（10-12月）:\n・テスト\n・リリース' }
              ]
            }
          ]
        }
      ]
    },
    {
      id: 'cabinet3',
      name: '会議資料',
      type: 'cabinet',
      expanded: false,
      children: [
        {
          id: 'folder3-1',
          name: '経営会議',
          type: 'folder',
          expanded: false,
          children: [
            {
              id: 'd6',
              name: '2024年度計画',
              type: 'document',
              color: 'yellow',
              pages: [
                { type: 'text', content: '2024年度 事業計画\n\n【重点施策】\n\n1. デジタルトランスフォーメーションの推進\n2. 顧客体験の向上\n3. 業務効率化\n4. 人材育成\n\n各施策について詳細を説明します。' },
                { type: 'text', content: '第1四半期の目標\n\n【4月】\n・新システムの導入準備\n・チーム体制の見直し\n\n【5月】\n・顧客満足度調査の実施\n・研修プログラムの開始\n\n【6月】\n・中間評価と軌道修正' },
                { type: 'text', content: '予算配分\n\nシステム開発: 40%（2,000万円）\nマーケティング: 30%（1,500万円）\n人材育成: 20%（1,000万円）\nその他: 10%（500万円）\n\n合計: 5,000万円' }
              ]
            }
          ]
        }
      ]
    }
  ]
};

const DocumentLibrary = () => {
  const [treeData, setTreeData] = useState(mockData);
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState('name-asc'); // 'name-asc', 'name-desc', 'date-asc', 'date-desc'
  const [currentFolder, setCurrentFolder] = useState(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showNewFolderModal, setShowNewFolderModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [selectedParentForNewFolder, setSelectedParentForNewFolder] = useState(null); // 新フォルダの親を選択
  const [showNewCabinetModal, setShowNewCabinetModal] = useState(false);
  const [newCabinetName, setNewCabinetName] = useState('');
  const [uploadFiles, setUploadFiles] = useState([]);
  const [selectedUploadFolder, setSelectedUploadFolder] = useState(null); // アップロード先フォルダ
  const [filteredDocuments, setFilteredDocuments] = useState([]);
  const [showFilePickerModal, setShowFilePickerModal] = useState(false);
  const [pdfScale] = useState(1.2);
  const [isDraggingFile, setIsDraggingFile] = useState(false); // ドラッグ&ドロップ状態

  // 削除確認モーダルの状態
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null); // { type: 'folder' | 'document', id: string, name: string }

  // ナビゲーション用の状態
  const [selectedParentFolder, setSelectedParentFolder] = useState(null);
  const [breadcrumbs, setBreadcrumbs] = useState([{ name: 'すべてのドキュメント', id: null }]);

  // ページめくりの状態管理
  const [dragState, setDragState] = useState({
    isDragging: false,
    startX: 0,
    currentX: 0,
    translateX: 0,
    startTime: 0,
    lastX: 0,
    lastTime: 0
  });

  const viewerRef = useRef(null);
  const fileInputRef = useRef(null);

  // ツリーの展開/折りたたみ
  const toggleNode = (nodeId, nodes) => {
    return nodes.map(node => {
      if (node.id === nodeId) {
        return { ...node, expanded: !node.expanded };
      }
      if (node.children) {
        return { ...node, children: toggleNode(nodeId, node.children) };
      }
      return node;
    });
  };

  const handleToggle = (nodeId) => {
    setTreeData(prev => ({
      ...prev,
      children: toggleNode(nodeId, prev.children)
    }));
  };

  // 現在選択されているフォルダの全ドキュメントを取得
  const getAllDocuments = (nodes) => {
    let docs = [];
    nodes.forEach(node => {
      if (node.type === 'document') {
        docs.push(node);
      } else if (node.children) {
        docs = [...docs, ...getAllDocuments(node.children)];
      }
    });
    return docs;
  };

  // ノードIDから現在ツリー内の最新ノードを取得
  const findNodeById = (nodes, nodeId) => {
    for (const node of nodes) {
      if (node.id === nodeId) return node;
      if (node.children) {
        const found = findNodeById(node.children, nodeId);
        if (found) return found;
      }
    }
    return null;
  };

  const allDocuments = useMemo(() => {
    console.log('allDocuments 再計算');
    console.log('currentFolder:', currentFolder);
    if (currentFolder) {
      const latestSelected = findNodeById(treeData.children, currentFolder.id);
      console.log('latestSelected:', latestSelected);
      const docs = latestSelected ? getAllDocuments([latestSelected]) : [];
      console.log('ドキュメント数:', docs.length);
      return docs;
    }
    const allDocs = getAllDocuments(treeData.children);
    console.log('全ドキュメント数:', allDocs.length);
    return allDocs;
  }, [currentFolder, treeData]);

  // 検索とソート機能
  useEffect(() => {
    // フィルタリング
    let result = searchQuery.trim() === ''
      ? [...allDocuments]
      : allDocuments.filter(doc =>
          doc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          doc.pages.some(page =>
            page.content && page.content.toLowerCase().includes(searchQuery.toLowerCase())
          )
        );

    // ソート処理
    result.sort((a, b) => {
      if (sortOrder === 'name-asc') {
        return a.name.localeCompare(b.name, 'ja');
      } else if (sortOrder === 'name-desc') {
        return b.name.localeCompare(a.name, 'ja');
      } else if (sortOrder === 'date-asc') {
        // IDに含まれるタイムスタンプでソート（古い順）
        const timeA = a.id.includes('uploaded_') ? parseInt(a.id.split('_')[1]) : 0;
        const timeB = b.id.includes('uploaded_') ? parseInt(b.id.split('_')[1]) : 0;
        return timeA - timeB;
      } else if (sortOrder === 'date-desc') {
        // IDに含まれるタイムスタンプでソート（新しい順）
        const timeA = a.id.includes('uploaded_') ? parseInt(a.id.split('_')[1]) : 0;
        const timeB = b.id.includes('uploaded_') ? parseInt(b.id.split('_')[1]) : 0;
        return timeB - timeA;
      }
      return 0;
    });

    setFilteredDocuments(result);
  }, [searchQuery, allDocuments, sortOrder]);

  const currentDocuments = filteredDocuments;


  // ページめくり - マウス操作（改善版：フリック検知対応）
  const handleMouseDown = (e) => {
    e.preventDefault();
    const now = Date.now();
    setDragState({
      isDragging: true,
      startX: e.clientX,
      currentX: e.clientX,
      translateX: 0,
      startTime: now,
      lastX: e.clientX,
      lastTime: now
    });
  };

  const handleMouseMove = (e) => {
    if (!dragState.isDragging) return;
    e.preventDefault();

    const currentX = e.clientX;
    const diff = currentX - dragState.startX;
    const now = Date.now();

    setDragState(prev => ({
      ...prev,
      currentX: currentX,
      translateX: diff,
      lastX: currentX,
      lastTime: now
    }));
  };

  const handleMouseUp = (e) => {
    if (!dragState.isDragging) return;
    e.preventDefault();

    const now = Date.now();
    const timeDiff = now - dragState.lastTime;
    const distance = dragState.translateX;

    // 速度を計算（px/ms）
    const velocity = timeDiff > 0 ? Math.abs(distance) / timeDiff : 0;

    // フリック判定: 速度が0.5以上、または距離が50px以上
    const isFlick = velocity > 0.5 || Math.abs(distance) > 50;

    if (isFlick) {
      if (distance > 0 && currentPage > 0) {
        setCurrentPage(currentPage - 1);
      } else if (distance < 0 && currentPage < selectedDocument.pages.length - 1) {
        setCurrentPage(currentPage + 1);
      }
    }

    setDragState({
      isDragging: false,
      startX: 0,
      currentX: 0,
      translateX: 0,
      startTime: 0,
      lastX: 0,
      lastTime: 0
    });
  };

  // タッチ操作（改善版：フリック検知対応）
  const handleTouchStart = (e) => {
    const now = Date.now();
    setDragState({
      isDragging: true,
      startX: e.touches[0].clientX,
      currentX: e.touches[0].clientX,
      translateX: 0,
      startTime: now,
      lastX: e.touches[0].clientX,
      lastTime: now
    });
  };

  const handleTouchMove = (e) => {
    if (!dragState.isDragging) return;

    const currentX = e.touches[0].clientX;
    const diff = currentX - dragState.startX;
    const now = Date.now();

    setDragState(prev => ({
      ...prev,
      currentX: currentX,
      translateX: diff,
      lastX: currentX,
      lastTime: now
    }));
  };

  const handleTouchEnd = () => {
    if (!dragState.isDragging) return;

    const now = Date.now();
    const timeDiff = now - dragState.lastTime;
    const distance = dragState.translateX;

    // 速度を計算（px/ms）
    const velocity = timeDiff > 0 ? Math.abs(distance) / timeDiff : 0;

    // フリック判定: 速度が0.5以上、または距離が50px以上
    const isFlick = velocity > 0.5 || Math.abs(distance) > 50;

    if (isFlick) {
      if (distance > 0 && currentPage > 0) {
        setCurrentPage(currentPage - 1);
      } else if (distance < 0 && currentPage < selectedDocument.pages.length - 1) {
        setCurrentPage(currentPage + 1);
      }
    }

    setDragState({
      isDragging: false,
      startX: 0,
      currentX: 0,
      translateX: 0,
      startTime: 0,
      lastX: 0,
      lastTime: 0
    });
  };

  // キーボード操作
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!selectedDocument) return;
      
      if (e.key === 'ArrowLeft' && currentPage > 0) {
        setCurrentPage(currentPage - 1);
      } else if (e.key === 'ArrowRight' && currentPage < selectedDocument.pages.length - 1) {
        setCurrentPage(currentPage + 1);
      } else if (e.key === 'Escape') {
        closeDocument();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedDocument, currentPage]);

  const openDocument = (doc) => {
    const safePages = Array.isArray(doc.pages) && doc.pages.length > 0
      ? doc.pages
      : [{ type: 'text', content: 'このドキュメントにはページがありません。' }];
    setSelectedDocument({ ...doc, pages: safePages });
    setCurrentPage(0);
    setDragState({
      isDragging: false,
      startX: 0,
      currentX: 0,
      translateX: 0,
      startTime: 0,
      lastX: 0,
      lastTime: 0
    });
  };

  const closeDocument = () => {
    setSelectedDocument(null);
    setCurrentPage(0);
    setDragState({
      isDragging: false,
      startX: 0,
      currentX: 0,
      translateX: 0,
      startTime: 0,
      lastX: 0,
      lastTime: 0
    });
  };

  // ファイルダウンロード処理
  const handleDownload = () => {
    if (!selectedDocument || !selectedDocument.originalFile) {
      alert('ダウンロードできるファイルがありません。');
      return;
    }

    try {
      const file = selectedDocument.originalFile;
      const fileName = selectedDocument.name;

      // Blob URLを作成
      const blob = new Blob([file], { type: file.type });
      const url = URL.createObjectURL(blob);

      // ダウンロード用のアンカー要素を作成
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();

      // クリーンアップ
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      console.log(`ダウンロード成功: ${fileName}`);
    } catch (error) {
      console.error('ダウンロードエラー:', error);
      alert(`ダウンロードに失敗しました: ${error.message}`);
    }
  };

  // 印刷処理
  const handlePrint = () => {
    if (!selectedDocument || !selectedDocument.pages || selectedDocument.pages.length === 0) {
      alert('印刷できるコンテンツがありません。');
      return;
    }

    try {
      const currentPageData = selectedDocument.pages[currentPage];

      // 印刷用のウィンドウを作成
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        alert('ポップアップがブロックされました。ポップアップを許可してください。');
        return;
      }

      let printContent = '';

      if (currentPageData.type === 'image' || currentPageData.url) {
        // 画像の場合
        printContent = `
          <!DOCTYPE html>
          <html>
            <head>
              <title>${selectedDocument.name} - ページ ${currentPage + 1}</title>
              <style>
                body {
                  margin: 0;
                  padding: 20px;
                  display: flex;
                  justify-content: center;
                  align-items: center;
                }
                img {
                  max-width: 100%;
                  height: auto;
                }
                @media print {
                  body { margin: 0; padding: 0; }
                  img { max-width: 100%; page-break-inside: avoid; }
                }
              </style>
            </head>
            <body>
              <img src="${currentPageData.url}" alt="${selectedDocument.name}" />
            </body>
          </html>
        `;
      } else if (currentPageData.type === 'html') {
        // HTML（Word/Excel）の場合
        printContent = `
          <!DOCTYPE html>
          <html>
            <head>
              <title>${selectedDocument.name} - ページ ${currentPage + 1}</title>
              <style>
                body {
                  margin: 20px;
                  font-family: system-ui, -apple-system, sans-serif;
                  color: #1f2937;
                  line-height: 1.75;
                  font-size: 14px;
                }
                table {
                  border-collapse: collapse;
                  width: 100%;
                  margin: 16px 0;
                  font-size: 14px;
                }
                table th {
                  background-color: #667eea;
                  color: white;
                  padding: 12px;
                  text-align: left;
                  font-weight: 600;
                  border: 1px solid #ddd;
                }
                table td {
                  padding: 10px 12px;
                  border: 1px solid #ddd;
                  color: #1f2937;
                }
                table tr:nth-child(even) {
                  background-color: #f9fafb;
                }
                @media print {
                  table { page-break-inside: auto; }
                  tr { page-break-inside: avoid; page-break-after: auto; }
                }
              </style>
            </head>
            <body>
              ${currentPageData.content}
            </body>
          </html>
        `;
      } else if (currentPageData.type === 'text') {
        // テキストの場合
        printContent = `
          <!DOCTYPE html>
          <html>
            <head>
              <title>${selectedDocument.name}</title>
              <style>
                body {
                  margin: 20px;
                  font-family: system-ui, -apple-system, sans-serif;
                  color: #1f2937;
                  line-height: 1.75;
                  font-size: 14px;
                }
                pre {
                  white-space: pre-wrap;
                  word-wrap: break-word;
                }
              </style>
            </head>
            <body>
              <pre>${currentPageData.content}</pre>
            </body>
          </html>
        `;
      } else if (currentPageData.type === 'video') {
        alert('動画ファイルは印刷できません。');
        printWindow.close();
        return;
      } else {
        alert('このファイル形式は印刷に対応していません。');
        printWindow.close();
        return;
      }

      printWindow.document.write(printContent);
      printWindow.document.close();

      // 画像の読み込みを待ってから印刷ダイアログを表示
      printWindow.onload = () => {
        setTimeout(() => {
          printWindow.print();
        }, 250);
      };

      console.log(`印刷ダイアログを表示: ${selectedDocument.name} (ページ ${currentPage + 1})`);
    } catch (error) {
      console.error('印刷エラー:', error);
      alert(`印刷に失敗しました: ${error.message}`);
    }
  };

  // ナビゲーション関数
  const handleParentFolderClick = (folder) => {
    setSelectedParentFolder(folder);
    setCurrentFolder(null);
    setBreadcrumbs([
      { name: 'すべてのドキュメント', id: null },
      { name: folder.name, id: folder.id }
    ]);
  };

  const handleChildFolderClick = (childFolder) => {
    setCurrentFolder(childFolder);
    if (selectedParentFolder) {
      setBreadcrumbs([
        { name: 'すべてのドキュメント', id: null },
        { name: selectedParentFolder.name, id: selectedParentFolder.id },
        { name: childFolder.name, id: childFolder.id }
      ]);
    }
  };

  const handleBreadcrumbClick = (index) => {
    const crumb = breadcrumbs[index];
    if (index === 0) {
      // すべてのドキュメント
      setSelectedParentFolder(null);
      setCurrentFolder(null);
      setBreadcrumbs([{ name: 'すべてのドキュメント', id: null }]);
    } else if (index === 1) {
      // 親フォルダ
      const parent = treeData.children.find(n => n.id === crumb.id);
      if (parent) {
        handleParentFolderClick(parent);
      }
    }
    // index === 2 は現在のフォルダなので何もしない
  };

  const getBinderColor = (color) => {
    const colors = {
      red: 'bg-red-500',
      blue: 'bg-blue-500',
      green: 'bg-green-500',
      yellow: 'bg-yellow-500',
      purple: 'bg-purple-500',
      orange: 'bg-orange-500',
      pink: 'bg-pink-500'
    };
    return colors[color] || 'bg-gray-500';
  };

  // CSS変数用の色値を取得する関数
  const getBinderColorValue = (color) => {
    const colors = {
      red: '#ef4444',
      blue: '#3b82f6',
      green: '#22c55e',
      yellow: '#eab308',
      purple: '#a855f7',
      pink: '#ec4899',
      orange: '#f97316',
      gray: '#6b7280'
    };
    return colors[color] || colors.blue;
  };

  // 全フォルダを取得する関数
  const getAllFolders = () => {
    const folders = [];

    const collectFolders = (nodes) => {
      for (const node of nodes) {
        if (node.type === 'folder') {
          folders.push(node);
        }
        if (node.children) {
          collectFolders(node.children);
        }
      }
    };

    if (treeData && treeData.children) {
      collectFolders(treeData.children);
    }

    return folders;
  };

  // ファイルアップロード処理 - 直接アップロード
  const handleFileUpload = async (event) => {
    console.log('handleFileUpload 呼び出し');
    const files = Array.from(event.target.files);

    if (files.length === 0) return;

    console.log('選択されたファイル数:', files.length);
    console.log('ファイル:', files);

    // デフォルトのフォルダを選択
    let targetFolder = null;
    if (currentFolder && currentFolder.type === 'folder') {
      targetFolder = currentFolder;
    } else {
      const allFolders = getAllFolders();
      console.log('利用可能なフォルダ数:', allFolders.length);
      if (allFolders.length > 0) {
        targetFolder = allFolders[0];
      }
    }

    if (!targetFolder) {
      alert('ファイルを保存するフォルダがありません。先にフォルダを作成してください。');
      return;
    }

    // ファイルを処理
    const newFiles = files.map(file => ({
      file,
      name: file.name.replace(/\.[^/.]+$/, ""),
      color: ['red', 'blue', 'green', 'yellow', 'purple', 'orange', 'pink'][Math.floor(Math.random() * 7)]
    }));

    console.log('デフォルトフォルダを設定:', targetFolder);

    // ファイルピッカーモーダルを閉じる
    setShowFilePickerModal(false);

    // 直接アップロード処理を実行
    await processDroppedFiles(newFiles, targetFolder);

    // input要素をリセット
    event.target.value = '';
  };

  // ドラッグ&ドロップ - ドラッグオーバー時
  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  // ドラッグ&ドロップ - ドラッグエンター時
  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDraggingFile(true);
    }
  };

  // ドラッグ&ドロップ - ドラッグリーブ時
  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    // content-areaから完全に出た時のみfalseに
    if (e.currentTarget === e.target) {
      setIsDraggingFile(false);
    }
  };

  // ドラッグ&ドロップ - ドロップ時
  const handleDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingFile(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length === 0) return;

    console.log('ドロップされたファイル数:', files.length);

    // デフォルトのフォルダを選択
    let targetFolder = null;
    if (currentFolder && currentFolder.type === 'folder') {
      targetFolder = currentFolder;
    } else {
      const allFolders = getAllFolders();
      if (allFolders.length > 0) {
        targetFolder = allFolders[0];
      }
    }

    if (!targetFolder) {
      alert('ファイルを保存するフォルダがありません。先にフォルダを作成してください。');
      return;
    }

    // ファイルを処理
    const newFiles = files.map(file => ({
      file,
      name: file.name.replace(/\.[^/.]+$/, ""),
      color: ['red', 'blue', 'green', 'yellow', 'purple', 'orange', 'pink'][Math.floor(Math.random() * 7)]
    }));

    setUploadFiles(newFiles);
    setSelectedUploadFolder(targetFolder);

    // 直接アップロード処理を実行
    await processDroppedFiles(newFiles, targetFolder);
  };

  // ドロップされたファイルを処理する専用関数
  const processDroppedFiles = async (files, targetFolder) => {
    console.log('processDroppedFiles 開始');
    console.log('files:', files);
    console.log('targetFolder:', targetFolder);

    const newDocuments = [];

    try {
      for (const fileData of files) {
        const { file, name, color } = fileData;
        const fileType = file.type;

        console.log(`処理中: ${name} (${fileType})`);

        let pages = [];

        if (fileType.startsWith('image/')) {
          const imageUrl = URL.createObjectURL(file);
          pages = [{ type: 'image', url: imageUrl }];
        } else if (fileType === 'application/pdf') {
          pages = await loadPDFFromFile(file);
        } else if (fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || file.name.endsWith('.docx')) {
          // Word (.docx)
          pages = await loadWordFromFile(file);
        } else if (fileType === 'application/msword' || file.name.endsWith('.doc')) {
          // 古いWord (.doc)
          pages = [{ type: 'text', content: `古いWord形式 (.doc) のファイルです。\n\n.docx形式に変換してからアップロードしてください。\n\nまたはWordで開いて「名前を付けて保存」→「.docx」で保存し直してください。` }];
        } else if (fileType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || file.name.endsWith('.xlsx')) {
          // Excel (.xlsx)
          pages = await loadExcelFromFile(file);
        } else if (fileType === 'application/vnd.ms-excel' || file.name.endsWith('.xls')) {
          // 古いExcel (.xls) - xlsxライブラリは.xlsも読める
          pages = await loadExcelFromFile(file);
        } else if (fileType === 'text/csv' || file.name.endsWith('.csv')) {
          // CSV
          pages = await loadCSVFromFile(file);
        } else if (fileType === 'application/json' || file.name.endsWith('.json')) {
          // JSON
          pages = await loadJSONFromFile(file);
        } else if (fileType === 'text/html' || file.name.endsWith('.html') || file.name.endsWith('.htm')) {
          // HTML
          pages = await loadHTMLFromFile(file);
        } else if (fileType === 'text/markdown' || file.name.endsWith('.md') || file.name.endsWith('.markdown')) {
          // Markdown
          pages = await loadMarkdownFromFile(file);
        } else if (fileType.startsWith('video/')) {
          const videoUrl = URL.createObjectURL(file);
          pages = [{ type: 'video', url: videoUrl }];
        } else if (fileType.startsWith('text/')) {
          const text = await file.text();
          pages = [{ type: 'text', content: text }];
        } else {
          pages = [{ type: 'text', content: `ファイル: ${name}\n\nファイルタイプ: ${fileType}\n\nこのファイル形式は現在プレビューに対応していません。` }];
        }

        const newDoc = {
          id: `uploaded_${Date.now()}_${Math.random()}`,
          name,
          type: 'document',
          color,
          pages,
          originalFile: file,  // オリジナルファイルを保存（ダウンロード用）
          fileType: fileType   // ファイルタイプを保存
        };

        newDocuments.push(newDoc);
        console.log('ドキュメント作成:', newDoc);
      }

      console.log('全ドキュメント作成完了:', newDocuments.length);
      console.log('保存先フォルダID:', targetFolder.id);

      addDocumentsToFolder(targetFolder.id, newDocuments);

      // アップロード後、フォルダを展開
      // 注: currentFolderはaddDocumentsToFolder内で自動的に更新されます
      handleToggle(targetFolder.id);

      // 親フォルダも展開
      const parentCabinet = treeData.children.find(cabinet =>
        cabinet.children && cabinet.children.some(child => child.id === targetFolder.id)
      );
      if (parentCabinet && !parentCabinet.expanded) {
        handleToggle(parentCabinet.id);
      }

      console.log('ファイルアップロード成功！');
      alert(`${newDocuments.length}個のファイルを「${targetFolder.name}」フォルダに保存しました！`);

      setUploadFiles([]);
      setSelectedUploadFolder(null);
    } catch (error) {
      console.error('アップロードエラー:', error);
      alert(`アップロードに失敗しました: ${error.message}`);
    }
  };

  // PDFファイルを読み込む関数
  const loadPDFFromFile = async (file) => {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
      const pages = [];
      
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: 1.5 });
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.height = viewport.height;
        canvas.width = viewport.width;
        
        await page.render({
          canvasContext: context,
          viewport: viewport
        }).promise;
        
        pages.push({
          type: 'image',
          url: canvas.toDataURL(),
          pageNumber: i
        });
      }
      
      return pages;
    } catch (error) {
      console.error('PDF読み込みエラー:', error);
      return [{ type: 'text', content: `PDFの読み込みに失敗しました: ${error.message}` }];
    }
  };

  // Wordファイルを読み込む関数
  const loadWordFromFile = async (file) => {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const result = await mammoth.convertToHtml({ arrayBuffer });
      const html = result.value;

      return [{
        type: 'html',
        content: html
      }];
    } catch (error) {
      console.error('Word読み込みエラー:', error);
      return [{ type: 'text', content: `Wordファイルの読み込みに失敗しました: ${error.message}` }];
    }
  };

  // Excelファイルを読み込む関数
  const loadExcelFromFile = async (file) => {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      const pages = [];

      // 各シートをHTMLテーブルに変換
      workbook.SheetNames.forEach((sheetName) => {
        const worksheet = workbook.Sheets[sheetName];
        const html = XLSX.utils.sheet_to_html(worksheet);

        pages.push({
          type: 'html',
          content: `<h2 style="margin-bottom: 16px; color: #1f2937;">${sheetName}</h2>${html}`,
          sheetName
        });
      });

      return pages;
    } catch (error) {
      console.error('Excel読み込みエラー:', error);
      return [{ type: 'text', content: `Excelファイルの読み込みに失敗しました: ${error.message}` }];
    }
  };

  // CSVファイルを読み込む関数
  const loadCSVFromFile = async (file) => {
    try {
      const text = await file.text();
      const workbook = XLSX.read(text, { type: 'string', raw: true });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const html = XLSX.utils.sheet_to_html(worksheet);

      return [{
        type: 'html',
        content: `<h2 style="margin-bottom: 16px; color: #1f2937;">CSVデータ</h2>${html}`
      }];
    } catch (error) {
      console.error('CSV読み込みエラー:', error);
      return [{ type: 'text', content: `CSVファイルの読み込みに失敗しました: ${error.message}` }];
    }
  };

  // JSONファイルを読み込む関数
  const loadJSONFromFile = async (file) => {
    try {
      const text = await file.text();
      const jsonData = JSON.parse(text);
      const formattedJSON = JSON.stringify(jsonData, null, 2);

      return [{
        type: 'html',
        content: `
          <h2 style="margin-bottom: 16px; color: #1f2937;">JSONデータ</h2>
          <pre style="
            background-color: #f3f4f6;
            padding: 20px;
            border-radius: 8px;
            overflow-x: auto;
            font-family: 'Courier New', monospace;
            font-size: 13px;
            line-height: 1.6;
            color: #1f2937;
          ">${formattedJSON}</pre>
        `
      }];
    } catch (error) {
      console.error('JSON読み込みエラー:', error);
      return [{ type: 'text', content: `JSONファイルの読み込みに失敗しました: ${error.message}` }];
    }
  };

  // HTMLファイルを読み込む関数
  const loadHTMLFromFile = async (file) => {
    try {
      const text = await file.text();
      return [{
        type: 'html',
        content: text
      }];
    } catch (error) {
      console.error('HTML読み込みエラー:', error);
      return [{ type: 'text', content: `HTMLファイルの読み込みに失敗しました: ${error.message}` }];
    }
  };

  // Markdownファイルを読み込む関数（基本的な変換）
  const loadMarkdownFromFile = async (file) => {
    try {
      const text = await file.text();

      // シンプルなMarkdown→HTML変換
      let html = text
        // ヘッダー
        .replace(/^### (.*$)/gim, '<h3>$1</h3>')
        .replace(/^## (.*$)/gim, '<h2>$1</h2>')
        .replace(/^# (.*$)/gim, '<h1>$1</h1>')
        // 太字
        .replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>')
        .replace(/\_\_(.*?)\_\_/gim, '<strong>$1</strong>')
        // イタリック
        .replace(/\*(.*?)\*/gim, '<em>$1</em>')
        .replace(/\_(.*?)\_/gim, '<em>$1</em>')
        // リンク
        .replace(/\[([^\]]+)\]\(([^)]+)\)/gim, '<a href="$2" target="_blank" style="color: #6366f1; text-decoration: underline;">$1</a>')
        // コードブロック
        .replace(/```([^`]+)```/gim, '<pre style="background-color: #f3f4f6; padding: 16px; border-radius: 8px; overflow-x: auto; margin: 12px 0;"><code>$1</code></pre>')
        .replace(/`([^`]+)`/gim, '<code style="background-color: #f3f4f6; padding: 2px 6px; border-radius: 4px; font-family: monospace;">$1</code>')
        // 改行をbrに変換
        .replace(/\n/gim, '<br>');

      return [{
        type: 'html',
        content: `<div style="line-height: 1.8;">${html}</div>`
      }];
    } catch (error) {
      console.error('Markdown読み込みエラー:', error);
      return [{ type: 'text', content: `Markdownファイルの読み込みに失敗しました: ${error.message}` }];
    }
  };


  // ファイルをドキュメントに変換
  const processUploadedFiles = async () => {
    console.log('processUploadedFiles 開始');
    console.log('uploadFiles:', uploadFiles);
    console.log('selectedUploadFolder:', selectedUploadFolder);

    if (!selectedUploadFolder) {
      alert('ファイルを保存するフォルダがありません。先にフォルダを作成してください。');
      console.error('選択されたフォルダがありません');
      return;
    }

    const newDocuments = [];

    try {
      for (const fileData of uploadFiles) {
        const { file, name, color } = fileData;
        const fileType = file.type;

        console.log(`処理中: ${name} (${fileType})`);

        let pages = [];

        if (fileType.startsWith('image/')) {
          const imageUrl = URL.createObjectURL(file);
          pages = [{ type: 'image', url: imageUrl }];
        } else if (fileType === 'application/pdf') {
          pages = await loadPDFFromFile(file);
        } else if (fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || file.name.endsWith('.docx')) {
          // Word (.docx)
          pages = await loadWordFromFile(file);
        } else if (fileType === 'application/msword' || file.name.endsWith('.doc')) {
          // 古いWord (.doc)
          pages = [{ type: 'text', content: `古いWord形式 (.doc) のファイルです。\n\n.docx形式に変換してからアップロードしてください。\n\nまたはWordで開いて「名前を付けて保存」→「.docx」で保存し直してください。` }];
        } else if (fileType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || file.name.endsWith('.xlsx')) {
          // Excel (.xlsx)
          pages = await loadExcelFromFile(file);
        } else if (fileType === 'application/vnd.ms-excel' || file.name.endsWith('.xls')) {
          // 古いExcel (.xls) - xlsxライブラリは.xlsも読める
          pages = await loadExcelFromFile(file);
        } else if (fileType === 'text/csv' || file.name.endsWith('.csv')) {
          // CSV
          pages = await loadCSVFromFile(file);
        } else if (fileType === 'application/json' || file.name.endsWith('.json')) {
          // JSON
          pages = await loadJSONFromFile(file);
        } else if (fileType === 'text/html' || file.name.endsWith('.html') || file.name.endsWith('.htm')) {
          // HTML
          pages = await loadHTMLFromFile(file);
        } else if (fileType === 'text/markdown' || file.name.endsWith('.md') || file.name.endsWith('.markdown')) {
          // Markdown
          pages = await loadMarkdownFromFile(file);
        } else if (fileType.startsWith('video/')) {
          const videoUrl = URL.createObjectURL(file);
          pages = [{ type: 'video', url: videoUrl }];
        } else if (fileType.startsWith('text/')) {
          const text = await file.text();
          pages = [{ type: 'text', content: text }];
        } else {
          pages = [{ type: 'text', content: `ファイル: ${name}\n\nファイルタイプ: ${fileType}\n\nこのファイル形式は現在プレビューに対応していません。` }];
        }

        const newDoc = {
          id: `uploaded_${Date.now()}_${Math.random()}`,
          name,
          type: 'document',
          color,
          pages,
          originalFile: file,  // オリジナルファイルを保存（ダウンロード用）
          fileType: fileType   // ファイルタイプを保存
        };

        newDocuments.push(newDoc);
        console.log('ドキュメント作成:', newDoc);
      }

      console.log('全ドキュメント作成完了:', newDocuments.length);
      console.log('保存先フォルダID:', selectedUploadFolder.id);

      addDocumentsToFolder(selectedUploadFolder.id, newDocuments);

      // アップロード後、フォルダを展開
      // 注: currentFolderはaddDocumentsToFolder内で自動的に更新されます
      handleToggle(selectedUploadFolder.id);

      // 親フォルダも展開
      const parentCabinet = treeData.children.find(cabinet =>
        cabinet.children && cabinet.children.some(child => child.id === selectedUploadFolder.id)
      );
      if (parentCabinet && !parentCabinet.expanded) {
        handleToggle(parentCabinet.id);
      }

      console.log('ファイルアップロード成功！');
      alert(`${newDocuments.length}個のファイルを「${selectedUploadFolder.name}」フォルダに保存しました！`);

      setUploadFiles([]);
      setSelectedUploadFolder(null);
      setShowUploadModal(false);
    } catch (error) {
      console.error('アップロードエラー:', error);
      alert(`アップロードに失敗しました: ${error.message}`);
    }
  };

  // フォルダにドキュメントを追加
  const addDocumentsToFolder = (folderId, documents) => {
    console.log('addDocumentsToFolder 呼び出し');
    console.log('folderId:', folderId);
    console.log('documents:', documents);

    const addToNode = (nodes) => {
      return nodes.map(node => {
        if (node.id === folderId) {
          console.log(`フォルダ「${node.name}」にドキュメントを追加`);
          const updated = { ...node, children: [...(node.children || []), ...documents] };
          console.log('更新後の子要素数:', updated.children.length);
          return updated;
        }
        if (node.children) {
          return { ...node, children: addToNode(node.children) };
        }
        return node;
      });
    };

    setTreeData(prev => {
      const newTreeData = {
        ...prev,
        children: addToNode(prev.children)
      };
      console.log('treeData更新完了');
      console.log('新しいtreeData:', JSON.stringify(newTreeData, null, 2));

      // 更新されたフォルダを取得してcurrentFolderにも設定
      const updatedFolder = findNodeById(newTreeData.children, folderId);
      if (updatedFolder) {
        console.log('currentFolderを更新:', updatedFolder);
        setCurrentFolder(updatedFolder);
      }

      return newTreeData;
    });
  };

  // 新しいフォルダを作成
  const createNewFolder = () => {
    if (!newFolderName.trim()) return;
    if (!selectedParentForNewFolder) return;

    const newFolder = {
      id: `folder_${Date.now()}`,
      name: newFolderName,
      type: 'folder',
      expanded: false,
      children: []
    };

    addDocumentsToFolder(selectedParentForNewFolder.id, [newFolder]);

    setNewFolderName('');
    setSelectedParentForNewFolder(null);
    setShowNewFolderModal(false);
  };

  // フォルダ作成モーダルを開く
  const openNewFolderModal = () => {
    // 現在選択中のキャビネットまたは最初のキャビネットを初期選択
    const initialParent = (selectedParentFolder && selectedParentFolder.type === 'cabinet')
      ? selectedParentFolder
      : (currentFolder && currentFolder.type === 'cabinet')
      ? currentFolder
      : treeData.children[0];

    setSelectedParentForNewFolder(initialParent);
    setShowNewFolderModal(true);
  };

  // キャビネット作成
  const createNewCabinet = () => {
    if (!newCabinetName.trim()) return;

    const newCabinet = {
      id: `cabinet_${Date.now()}`,
      name: newCabinetName,
      type: 'cabinet',
      expanded: false,
      children: []
    };

    setTreeData(prev => ({
      ...prev,
      children: [...prev.children, newCabinet]
    }));

    setNewCabinetName('');
    setShowNewCabinetModal(false);
  };

  // 削除確認ダイアログを開く
  const confirmDelete = (type, id, name) => {
    setDeleteTarget({ type, id, name });
    setShowDeleteModal(true);
  };

  // フォルダまたはドキュメントを削除
  const executeDelete = () => {
    if (!deleteTarget) return;

    const removeFromNode = (nodes) => {
      return nodes.map(node => {
        if (node.children) {
          const filteredChildren = node.children.filter(child => child.id !== deleteTarget.id);
          return {
            ...node,
            children: removeFromNode(filteredChildren)
          };
        }
        return node;
      }).filter(node => node.id !== deleteTarget.id);
    };

    setTreeData(prev => ({
      ...prev,
      children: removeFromNode(prev.children)
    }));

    // 削除したアイテムが現在選択されているものだった場合、選択を解除
    if (deleteTarget.type === 'folder' && currentFolder?.id === deleteTarget.id) {
      setCurrentFolder(null);
      setSelectedParentFolder(null);
      setBreadcrumbs([{ name: 'すべてのドキュメント', id: null }]);
    }
    if (deleteTarget.type === 'document' && selectedDocument?.id === deleteTarget.id) {
      setSelectedDocument(null);
    }

    setShowDeleteModal(false);
    setDeleteTarget(null);
  };

  // エクスポート機能
  const exportLibrary = () => {
    const dataStr = JSON.stringify(treeData, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    const exportFileDefaultName = `library-export-${new Date().toISOString().split('T')[0]}.json`;

    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  // インポート機能
  const importLibrary = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const importedData = JSON.parse(e.target.result);
        setTreeData(importedData);
        alert('ライブラリをインポートしました！');
      } catch (error) {
        alert('インポートに失敗しました。JSONファイルを確認してください。');
        console.error('Import error:', error);
      }
    };
    reader.readAsText(file);
  };

  // 個別ファイル選択
  const handleIndividualFileUpload = () => {
    console.log('個別ファイル選択が開始されました');
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    // すべてのファイル形式を許可
    input.accept = '.pdf,.jpg,.jpeg,.png,.heic,.txt,.mp4,.mov,.avi,.webp,.gif,.bmp,.docx,.doc,.xlsx,.xls,.csv,.json,.html,.htm,.md,.markdown';
    input.onchange = handleFileUpload;
    input.click();
    setShowFilePickerModal(false);
  };

  // フォルダ一括選択 - 直接アップロード
  const handleFolderUpload = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.webkitdirectory = true;
    input.multiple = true;
    input.onchange = async (e) => {
      const files = Array.from(e.target.files);

      if (files.length === 0) return;

      // デフォルトのフォルダを選択
      let targetFolder = null;
      if (currentFolder && currentFolder.type === 'folder') {
        targetFolder = currentFolder;
      } else {
        const allFolders = getAllFolders();
        if (allFolders.length > 0) {
          targetFolder = allFolders[0];
        }
      }

      if (!targetFolder) {
        alert('ファイルを保存するフォルダがありません。先にフォルダを作成してください。');
        return;
      }

      const newFiles = files.map(file => ({
        file,
        name: file.name.replace(/\.[^/.]+$/, ""),
        color: ['red', 'blue', 'green', 'yellow', 'purple', 'orange', 'pink'][Math.floor(Math.random() * 7)]
      }));

      // ファイルピッカーモーダルを閉じる
      setShowFilePickerModal(false);

      // 直接アップロード処理を実行
      await processDroppedFiles(newFiles, targetFolder);
    };
    input.click();
    setShowFilePickerModal(false);
  };

  // ドキュメントが所属するフォルダを探す関数
  const findDocumentFolder = (documentId) => {
    let result = null;

    const searchNode = (nodes, parentPath = []) => {
      for (const node of nodes) {
        if (node.type === 'folder' && node.children) {
          const hasDocument = node.children.some(child => child.id === documentId);
          if (hasDocument) {
            result = { folder: node, path: [...parentPath, node] };
            return true;
          }
          if (searchNode(node.children, [...parentPath, node])) {
            return true;
          }
        }
      }
      return false;
    };

    if (treeData && treeData.children) {
      searchNode(treeData.children);
    }

    return result;
  };

  // ツリーノードのレンダリング
  const TreeNode = ({ node, level = 0 }) => {
    const isExpanded = node.expanded;
    const hasChildren = node.children && node.children.length > 0;
    const isSelected = currentFolder?.id === node.id;
    
    const handleNodeToggle = (e) => {
      e.stopPropagation();
      if (hasChildren) {
        handleToggle(node.id);
      }
    };
    
    const handleSelect = () => {
      if (node.type === 'cabinet') {
        handleParentFolderClick(node);
      } else if (node.type === 'folder') {
        // 親フォルダが選択されているかチェック
        const parentNode = treeData.children.find(parent =>
          parent.children && parent.children.some(child => child.id === node.id)
        );
        if (parentNode) {
          handleChildFolderClick(node);
        } else {
          setCurrentFolder(node);
        }
      }
    };
    
    if (node.type === 'cabinet') {
      return (
        <div className="cabinet">
          <div
            className="cabinet-header"
            onClick={(e) => {
              handleNodeToggle(e);
              handleSelect();
            }}
          >
            <ChevronDown 
              className={`w-4 h-4 transition-transform ${
                isExpanded ? 'rotate-0' : '-rotate-90'
              }`} 
            />
            <Book className="w-5 h-5" />
            <span>{node.name}</span>
          </div>
          
          {isExpanded && hasChildren && (
            <div className="pb-3">
              {node.children.map(child => (
                <TreeNode key={child.id} node={child} level={level + 1} />
              ))}
            </div>
          )}
        </div>
      );
    }
    
    if (node.type === 'folder') {
      return (
        <div className="folder">
          <div
            className={`folder-header ${
              isSelected ? 'bg-opacity-80' : ''
            }`}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative' }}
            onClick={() => {
              handleSelect();
              if (hasChildren) handleNodeToggle();
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
              {hasChildren && (
                <ChevronDown
                  className={`w-4 h-4 transition-transform ${
                    isExpanded ? 'rotate-0' : '-rotate-90'
                  }`}
                />
              )}
              {isExpanded ? <FolderOpen className="w-4 h-4" /> : <Folder className="w-4 h-4" />}
              <span>{node.name}</span>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                confirmDelete('folder', node.id, node.name);
              }}
              style={{
                padding: '6px 8px',
                background: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: '6px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px',
                transition: 'all 0.2s',
                fontSize: '11px',
                fontWeight: '500',
                color: '#dc2626'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(239, 68, 68, 0.25)';
                e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.5)';
                e.currentTarget.style.transform = 'scale(1.05)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(239, 68, 68, 0.15)';
                e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.3)';
                e.currentTarget.style.transform = 'scale(1)';
              }}
              title="フォルダを削除"
            >
              <Trash2 style={{ width: '13px', height: '13px', color: '#dc2626' }} />
              <span>削除</span>
            </button>
          </div>

          {isExpanded && hasChildren && (
            <div>
              {node.children.map(child => (
                <TreeNode key={child.id} node={child} level={level + 1} />
              ))}
            </div>
          )}
        </div>
      );
    }
    
    // Document item
    return (
      <div
        className="document-item"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          openDocument(node);
        }}
      >
        <div className={`document-spine ${getBinderColor(node.color)}`} />
        <File className="w-4 h-4" />
        <span className="flex-1 truncate">{node.name}</span>
        <span className="text-xs opacity-70">
          {node.pages?.length || 0}p
        </span>
      </div>
    );
  };

  return (
    <>
      <style>{styles}</style>
      <div className="library-container">
        {/* ヘッダー - 改善版 */}
        <header style={{
          backgroundColor: 'white',
          borderBottom: '1px solid #e5e7eb',
          padding: '16px 32px',
          position: 'sticky',
          top: 0,
          zIndex: 100,
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            {/* タイトル */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Book style={{ width: '32px', height: '32px', color: '#6366f1' }} />
              <h1 style={{
                fontSize: '24px',
                fontWeight: '700',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                margin: 0
              }}>楽々ライブラリ</h1>
            </div>

            {/* アクションボタン */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <button
                onClick={() => setShowFilePickerModal(true)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 20px',
                  backgroundColor: '#6366f1',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  boxShadow: '0 2px 4px rgba(99, 102, 241, 0.2)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#4f46e5';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                  e.currentTarget.style.boxShadow = '0 4px 8px rgba(99, 102, 241, 0.3)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#6366f1';
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 2px 4px rgba(99, 102, 241, 0.2)';
                }}
              >
                <Plus style={{ width: '18px', height: '18px' }} />
                ファイルを追加
              </button>

              <button
                onClick={openNewFolderModal}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 20px',
                  backgroundColor: 'white',
                  color: '#6366f1',
                  border: '2px solid #6366f1',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#f0f1ff';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'white';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                <FolderPlus style={{ width: '18px', height: '18px' }} />
                フォルダ作成
              </button>

              <button
                onClick={() => setShowNewCabinetModal(true)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 20px',
                  backgroundColor: 'white',
                  color: '#8b5cf6',
                  border: '2px solid #8b5cf6',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#faf5ff';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'white';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                <Book style={{ width: '18px', height: '18px' }} />
                親フォルダ作成
              </button>

              <button
                onClick={exportLibrary}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 20px',
                  backgroundColor: 'white',
                  color: '#64748b',
                  border: '2px solid #e2e8f0',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#f8fafc';
                  e.currentTarget.style.borderColor = '#cbd5e1';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'white';
                  e.currentTarget.style.borderColor = '#e2e8f0';
                }}
              >
                <Download style={{ width: '18px', height: '18px' }} />
                エクスポート
              </button>

              {/* ソート選択 */}
              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
                style={{
                  padding: '10px 16px',
                  backgroundColor: 'white',
                  color: '#64748b',
                  border: '2px solid #e2e8f0',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  outline: 'none'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#f8fafc';
                  e.currentTarget.style.borderColor = '#cbd5e1';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'white';
                  e.currentTarget.style.borderColor = '#e2e8f0';
                }}
              >
                <option value="name-asc">名前順 (A → Z)</option>
                <option value="name-desc">名前順 (Z → A)</option>
                <option value="date-asc">日付順 (古い順)</option>
                <option value="date-desc">日付順 (新しい順)</option>
              </select>
            </div>
          </div>
        </header>

        <div className="library-main">
          {/* サイドバー */}
          <div className="sidebar">
            <div className="sidebar-header">
              <div className="search-container">
                <input
                  type="text"
                  placeholder="ドキュメントを検索..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="search-input"
                />
                <Search className="search-icon w-4 h-4" />
              </div>
              <h3 className="text-sm font-semibold uppercase tracking-wide">ライブラリ</h3>
            </div>
            
            <div className="p-2">
              {treeData.children.map(node => (
                <TreeNode key={node.id} node={node} />
              ))}
            </div>
          </div>

          {/* メインコンテンツ - 改善版 + ドラッグ&ドロップ対応 */}
          <div
            className="content-area"
            style={{
              borderRadius: '16px',
              border: isDraggingFile ? '3px dashed #8b5cf6' : '1px solid rgba(255, 255, 255, 0.3)',
              margin: '0 24px 24px 0',
              overflow: 'hidden',
              position: 'relative',
              backgroundColor: isDraggingFile ? 'rgba(139, 92, 246, 0.05)' : 'transparent',
              transition: 'all 0.3s ease'
            }}
            onDragOver={handleDragOver}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            {/* パンくずリスト */}
            <div style={{
              padding: '16px 24px',
              backgroundColor: 'rgba(255, 255, 255, 0.7)',
              backdropFilter: 'blur(10px)',
              borderBottom: '1px solid rgba(0,0,0,0.05)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              {breadcrumbs.map((crumb, index) => (
                <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button
                    onClick={() => handleBreadcrumbClick(index)}
                    style={{
                      color: index === breadcrumbs.length - 1 ? '#6366f1' : '#64748b',
                      fontWeight: index === breadcrumbs.length - 1 ? '600' : '400',
                      fontSize: '14px',
                      background: 'none',
                      border: 'none',
                      cursor: index === breadcrumbs.length - 1 ? 'default' : 'pointer',
                      padding: '4px 8px',
                      borderRadius: '6px',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      if (index !== breadcrumbs.length - 1) {
                        e.currentTarget.style.backgroundColor = 'rgba(99, 102, 241, 0.1)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                  >
                    {crumb.name}
                  </button>
                  {index < breadcrumbs.length - 1 && (
                    <ChevronRight style={{ width: '16px', height: '16px', color: '#cbd5e1' }} />
                  )}
                </div>
              ))}
            </div>

            {/* コンテンツヘッダー */}
            <div style={{
              padding: '24px 24px 16px 24px',
              backgroundColor: 'rgba(255, 255, 255, 0.5)'
            }}>
              <h2 style={{
                fontSize: '24px',
                fontWeight: '700',
                color: '#1f2937',
                margin: 0
              }}>
                {currentFolder ? currentFolder.name : selectedParentFolder ? selectedParentFolder.name : 'すべてのドキュメント'}
              </h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '4px' }}>
                <p style={{
                  fontSize: '14px',
                  color: '#64748b',
                  margin: 0
                }}>
                  {selectedParentFolder && !currentFolder
                    ? `${selectedParentFolder.children?.length || 0} 個のフォルダ`
                    : `${currentDocuments.length} 件のドキュメント`}
                </p>
                <span style={{
                  fontSize: '12px',
                  color: '#9ca3af',
                  padding: '4px 8px',
                  backgroundColor: 'rgba(139, 92, 246, 0.1)',
                  borderRadius: '6px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px'
                }}>
                  <Upload style={{ width: '12px', height: '12px' }} />
                  ドラッグ&ドロップでファイル追加
                </span>
              </div>
            </div>

            {/* グリッド表示エリア */}
            <div className="document-grid" style={{ flex: 1, position: 'relative' }}>
              {/* ドラッグ&ドロップオーバーレイ */}
              {isDraggingFile && (
                <div style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  backgroundColor: 'rgba(139, 92, 246, 0.1)',
                  backdropFilter: 'blur(4px)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '16px',
                  zIndex: 1000,
                  pointerEvents: 'none'
                }}>
                  <div style={{
                    width: '120px',
                    height: '120px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 8px 32px rgba(102, 126, 234, 0.4)',
                    animation: 'pulse 2s ease-in-out infinite'
                  }}>
                    <Upload style={{ width: '60px', height: '60px', color: 'white' }} />
                  </div>
                  <div style={{
                    fontSize: '24px',
                    fontWeight: '700',
                    color: '#8b5cf6',
                    textAlign: 'center',
                    textShadow: '0 2px 8px rgba(255, 255, 255, 0.8)'
                  }}>
                    ここにファイルをドロップ
                  </div>
                  <div style={{
                    fontSize: '16px',
                    color: '#6b7280',
                    textAlign: 'center',
                    backgroundColor: 'white',
                    padding: '8px 16px',
                    borderRadius: '20px',
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
                  }}>
                    {currentFolder ? `「${currentFolder.name}」フォルダに保存されます` : '最初のフォルダに保存されます'}
                  </div>
                </div>
              )}

              {/* 親フォルダが選択されている場合は子フォルダを表示 */}
              {selectedParentFolder && !currentFolder ? (
                selectedParentFolder.children && selectedParentFolder.children.length > 0 ? (
                  selectedParentFolder.children.map(childFolder => (
                    <div
                      key={childFolder.id}
                      onClick={() => handleChildFolderClick(childFolder)}
                      style={{
                        background: 'white',
                        borderRadius: '16px',
                        padding: '24px',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                        border: '2px solid transparent'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'translateY(-4px)';
                        e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.12)';
                        e.currentTarget.style.borderColor = '#6366f1';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.05)';
                        e.currentTarget.style.borderColor = 'transparent';
                      }}
                    >
                      <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '16px'
                      }}>
                        <div style={{
                          width: '80px',
                          height: '80px',
                          borderRadius: '16px',
                          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}>
                          <Folder style={{ width: '40px', height: '40px', color: 'white' }} />
                        </div>
                        <div style={{ textAlign: 'center', width: '100%' }}>
                          <div style={{
                            fontWeight: '600',
                            fontSize: '16px',
                            color: '#1f2937',
                            marginBottom: '4px'
                          }}>
                            {childFolder.name}
                          </div>
                          <div style={{
                            fontSize: '14px',
                            color: '#64748b'
                          }}>
                            {childFolder.children?.filter(child => child.type !== 'folder').length || 0} ドキュメント
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div
                    className="col-span-full flex flex-col items-center justify-center"
                    style={{
                      minHeight: '400px',
                      margin: '20px',
                      border: '3px dashed #cbd5e1',
                      borderRadius: '24px',
                      backgroundColor: 'rgba(255, 255, 255, 0.5)',
                      cursor: 'pointer',
                      transition: 'all 0.3s ease',
                      padding: '40px'
                    }}
                    onClick={() => fileInputRef.current?.click()}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = '#8b5cf6';
                      e.currentTarget.style.backgroundColor = 'rgba(139, 92, 246, 0.05)';
                      e.currentTarget.style.transform = 'scale(1.02)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = '#cbd5e1';
                      e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.5)';
                      e.currentTarget.style.transform = 'scale(1)';
                    }}
                  >
                    <div style={{
                      width: '120px',
                      height: '120px',
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginBottom: '24px',
                      boxShadow: '0 8px 32px rgba(102, 126, 234, 0.3)'
                    }}>
                      <Upload style={{ width: '60px', height: '60px', color: 'white' }} />
                    </div>
                    <p style={{
                      fontSize: '24px',
                      fontWeight: '700',
                      color: '#1f2937',
                      marginBottom: '12px'
                    }}>
                      フォルダが空です
                    </p>
                    <p style={{
                      fontSize: '16px',
                      color: '#64748b',
                      marginBottom: '8px'
                    }}>
                      ファイルをドラッグ＆ドロップ、またはクリックして追加
                    </p>
                    <p style={{
                      fontSize: '14px',
                      color: '#9ca3af',
                      marginTop: '16px'
                    }}>
                      対応形式: PDF、画像、動画、テキストファイル
                    </p>
                  </div>
                )
              ) : currentDocuments.length === 0 ? (
                <div
                  className="col-span-full flex flex-col items-center justify-center"
                  style={{
                    minHeight: '400px',
                    margin: '20px',
                    border: '3px dashed #cbd5e1',
                    borderRadius: '24px',
                    backgroundColor: 'rgba(255, 255, 255, 0.5)',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    padding: '40px'
                  }}
                  onClick={() => fileInputRef.current?.click()}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = '#8b5cf6';
                    e.currentTarget.style.backgroundColor = 'rgba(139, 92, 246, 0.05)';
                    e.currentTarget.style.transform = 'scale(1.02)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = '#cbd5e1';
                    e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.5)';
                    e.currentTarget.style.transform = 'scale(1)';
                  }}
                >
                  <div style={{
                    width: '120px',
                    height: '120px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: '24px',
                    boxShadow: '0 8px 32px rgba(102, 126, 234, 0.3)'
                  }}>
                    <Upload style={{ width: '60px', height: '60px', color: 'white' }} />
                  </div>
                  <p style={{
                    fontSize: '24px',
                    fontWeight: '700',
                    color: '#1f2937',
                    marginBottom: '12px'
                  }}>
                    {searchQuery ? '検索条件に一致するドキュメントが見つかりません' : 'ファイルをドラッグ＆ドロップ'}
                  </p>
                  {!searchQuery && (
                    <>
                      <p style={{
                        fontSize: '16px',
                        color: '#64748b',
                        marginBottom: '8px'
                      }}>
                        または、クリックしてファイルを選択
                      </p>
                      <p style={{
                        fontSize: '14px',
                        color: '#9ca3af',
                        marginTop: '16px'
                      }}>
                        対応形式: PDF、画像、動画、テキストファイル
                      </p>
                    </>
                  )}
                </div>
              ) : (
                currentDocuments.map(doc => {
                  const folderInfo = findDocumentFolder(doc.id);
                  const folderName = folderInfo ? folderInfo.folder.name : 'その他';

                  return (
                    <div
                      key={doc.id}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        openDocument(doc);
                      }}
                      className="document-card"
                      style={{ '--doc-color': getBinderColorValue(doc.color), cursor: 'pointer', position: 'relative' }}
                    >
                      {/* 削除ボタン - 右上に配置 */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          confirmDelete('document', doc.id, doc.name);
                        }}
                        style={{
                          position: 'absolute',
                          top: '8px',
                          right: '8px',
                          padding: '6px',
                          background: 'rgba(239, 68, 68, 0.9)',
                          border: 'none',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          transition: 'all 0.2s',
                          zIndex: 10,
                          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = 'rgba(220, 38, 38, 1)';
                          e.currentTarget.style.transform = 'scale(1.1)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'rgba(239, 68, 68, 0.9)';
                          e.currentTarget.style.transform = 'scale(1)';
                        }}
                        title="ドキュメントを削除"
                      >
                        <Trash2 style={{ width: '16px', height: '16px', color: 'white' }} />
                      </button>

                      <div className="aspect-[3/4] bg-gradient-to-br from-gray-50 to-gray-100 relative overflow-hidden rounded-lg mb-3">
                        {doc.pages && doc.pages[0] ? (
                          doc.pages[0].type === 'image' && doc.pages[0].url && (doc.pages[0].url.startsWith('http') || doc.pages[0].url.startsWith('data:') || doc.pages[0].url.startsWith('blob:')) ? (
                            <img
                              src={doc.pages[0].url}
                              alt={doc.name}
                              className="w-full h-full object-cover"
                            />
                          ) : doc.pages[0].type === 'text' ? (
                            <div className="p-3 h-full flex flex-col justify-center">
                              <FileText className="w-8 h-8 text-blue-500 mb-2 mx-auto" />
                              <div className="text-xs text-gray-600 line-clamp-4 leading-relaxed">
                                {doc.pages[0].content.substring(0, 150)}...
                              </div>
                            </div>
                          ) : doc.pages[0].type === 'video' ? (
                            <div className="h-full flex flex-col items-center justify-center">
                              <Video className="w-8 h-8 text-purple-500 mb-2" />
                              <span className="text-xs text-gray-600">動画ファイル</span>
                            </div>
                          ) : (
                            <div className="h-full flex flex-col items-center justify-center">
                              <Image className="w-8 h-8 text-gray-400 mb-2" />
                              <span className="text-xs text-gray-500">画像ファイル</span>
                            </div>
                          )
                        ) : (
                          <div className="h-full flex flex-col items-center justify-center">
                            <File className="w-8 h-8 text-gray-400 mb-2" />
                            <span className="text-xs text-gray-500">ファイル</span>
                          </div>
                        )}

                        {/* ページ数バッジ - 左上に配置 */}
                        <div className="absolute top-2 left-2 bg-black bg-opacity-70 text-white text-xs px-2 py-1 rounded-full">
                          {doc.pages ? doc.pages.length : 0}
                        </div>
                      </div>

                      {/* フォルダ名を表示 */}
                      <div style={{
                        fontSize: '11px',
                        color: '#6b7280',
                        marginBottom: '4px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}>
                        <Folder style={{ width: '12px', height: '12px' }} />
                        <span>{folderName}</span>
                      </div>

                      <div className="document-title">
                        {doc.name}
                      </div>
                      <div className="document-pages">
                        {doc.pages ? doc.pages.length : 0} ページ
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ドキュメントビューワー（モーダル） - 改善版 */}
      {selectedDocument && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 999999,
            backgroundColor: 'rgba(0, 0, 0, 0.95)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          onClick={closeDocument}
          data-testid="modal-overlay"
        >
          {/* ヘッダーエリア */}
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '80px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 24px',
            zIndex: 200,
            background: 'linear-gradient(to bottom, rgba(0,0,0,0.6), transparent)'
          }}>
            {/* ページカウンター */}
            <div style={{
              position: 'absolute',
              left: '50%',
              transform: 'translateX(-50%)',
              backgroundColor: 'rgba(0, 0, 0, 0.8)',
              color: 'white',
              padding: '8px 24px',
              borderRadius: '24px',
              fontSize: '16px',
              fontWeight: '600',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)'
            }}>
              <span style={{ color: '#fff' }}>{currentPage + 1}</span>
              <span style={{ color: '#888', margin: '0 8px' }}>/</span>
              <span style={{ color: '#aaa' }}>{selectedDocument.pages.length}</span>
            </div>

            {/* 印刷ボタン */}
            <button
              onClick={(e) => { e.stopPropagation(); handlePrint(); }}
              style={{
                position: 'absolute',
                right: '144px',
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                border: 'none',
                borderRadius: '50%',
                width: '48px',
                height: '48px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.2s',
                backdropFilter: 'blur(10px)'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.2)'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)'}
              title="印刷"
            >
              <Printer style={{ width: '24px', height: '24px', color: 'white' }} />
            </button>

            {/* ダウンロードボタン */}
            <button
              onClick={(e) => { e.stopPropagation(); handleDownload(); }}
              style={{
                position: 'absolute',
                right: '84px',
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                border: 'none',
                borderRadius: '50%',
                width: '48px',
                height: '48px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.2s',
                backdropFilter: 'blur(10px)'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.2)'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)'}
              title="ダウンロード"
            >
              <Download style={{ width: '24px', height: '24px', color: 'white' }} />
            </button>

            {/* 閉じるボタン */}
            <button
              onClick={(e) => { e.stopPropagation(); closeDocument(); }}
              style={{
                position: 'absolute',
                right: '24px',
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                border: 'none',
                borderRadius: '50%',
                width: '48px',
                height: '48px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.2s',
                backdropFilter: 'blur(10px)'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.2)'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)'}
              title="閉じる (ESC)"
            >
              <X style={{ width: '24px', height: '24px', color: 'white' }} />
            </button>
          </div>

          {/* ナビゲーションボタン（左） */}
          {currentPage > 0 && (
            <button
              onClick={(e) => { e.stopPropagation(); setCurrentPage(currentPage - 1); }}
              style={{
                position: 'absolute',
                left: '24px',
                top: '50%',
                transform: 'translateY(-50%)',
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                border: 'none',
                borderRadius: '50%',
                width: '56px',
                height: '56px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.2s',
                zIndex: 200,
                backdropFilter: 'blur(10px)'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.2)'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)'}
              title="前のページ (←)"
            >
              <ChevronLeft style={{ width: '32px', height: '32px', color: 'white' }} />
            </button>
          )}

          {/* ナビゲーションボタン（右） */}
          {currentPage < selectedDocument.pages.length - 1 && (
            <button
              onClick={(e) => { e.stopPropagation(); setCurrentPage(currentPage + 1); }}
              style={{
                position: 'absolute',
                right: '24px',
                top: '50%',
                transform: 'translateY(-50%)',
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                border: 'none',
                borderRadius: '50%',
                width: '56px',
                height: '56px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.2s',
                zIndex: 200,
                backdropFilter: 'blur(10px)'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.2)'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)'}
              title="次のページ (→)"
            >
              <ChevronRight style={{ width: '32px', height: '32px', color: 'white' }} />
            </button>
          )}

          {/* コンテンツエリア */}
          <div
            ref={viewerRef}
            style={{
              cursor: dragState.isDragging ? 'grabbing' : 'grab',
              touchAction: 'none',
              width: '100%',
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '100px 40px 160px 40px',
              position: 'relative',
              zIndex: 100
            }}
            onClick={(e) => e.stopPropagation()}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={() => {
              if (dragState.isDragging) handleMouseUp({ preventDefault: () => {} });
            }}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            <div
              key={currentPage}
              style={{
                transform: `translateX(${dragState.translateX}px) ${dragState.isDragging ? 'scale(0.95)' : 'scale(1)'}`,
                opacity: dragState.isDragging ? 0.9 : 1,
                zIndex: 60,
                maxWidth: '900px',
                width: '100%',
                transition: dragState.isDragging ? 'transform 0.1s ease-out' : 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                position: 'relative',
                pointerEvents: 'auto'
              }}
            >
              {selectedDocument.pages[currentPage].type === 'text' ? (
                <div
                  style={{
                    backgroundColor: '#ffffff',
                    color: '#000000',
                    borderRadius: '12px',
                    padding: '48px',
                    minHeight: '600px',
                    maxHeight: '80vh',
                    overflowY: 'auto',
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
                    position: 'relative',
                    zIndex: 100,
                    pointerEvents: 'auto'
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <pre style={{
                    whiteSpace: 'pre-wrap',
                    fontFamily: 'system-ui, -apple-system, sans-serif',
                    color: '#1f2937',
                    lineHeight: '1.75',
                    fontSize: '18px',
                    margin: 0
                  }}>
                    {selectedDocument.pages[currentPage].content}
                  </pre>
                </div>
              ) : selectedDocument.pages[currentPage].type === 'pdf' ? (
                <div
                  style={{
                    backgroundColor: '#ffffff',
                    borderRadius: '12px',
                    padding: '16px',
                    maxHeight: '80vh',
                    overflow: 'hidden',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
                    position: 'relative',
                    zIndex: 100,
                    pointerEvents: 'auto'
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <Document
                    file={selectedDocument.pages[currentPage].url}
                    loading={
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '32px' }}>
                        <div style={{ color: '#6b7280' }}>PDFを読み込み中...</div>
                      </div>
                    }
                    error={
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '32px' }}>
                        <div style={{ color: '#ef4444' }}>PDFの読み込みに失敗しました</div>
                      </div>
                    }
                  >
                    <Page
                      pageNumber={selectedDocument.pages[currentPage].pageNumber || 1}
                      scale={pdfScale}
                      renderTextLayer={false}
                      renderAnnotationLayer={false}
                    />
                  </Document>
                </div>
              ) : selectedDocument.pages[currentPage].type === 'html' ? (
                <div
                  onClick={(e) => e.stopPropagation()}
                  dangerouslySetInnerHTML={{ __html: selectedDocument.pages[currentPage].content }}
                  style={{
                    backgroundColor: '#ffffff',
                    borderRadius: '12px',
                    padding: '48px',
                    minHeight: '600px',
                    maxHeight: '80vh',
                    overflowY: 'auto',
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
                    position: 'relative',
                    zIndex: 100,
                    pointerEvents: 'auto',
                    fontFamily: 'system-ui, -apple-system, sans-serif',
                    color: '#1f2937',
                    lineHeight: '1.75',
                    fontSize: '14px'
                  }}
                />
              ) : selectedDocument.pages[currentPage].type === 'video' ? (
                <div
                  style={{
                    backgroundColor: '#ffffff',
                    borderRadius: '12px',
                    padding: '16px',
                    maxHeight: '80vh',
                    overflow: 'hidden',
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
                    position: 'relative',
                    zIndex: 100,
                    pointerEvents: 'auto'
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <video
                    src={selectedDocument.pages[currentPage].url}
                    controls
                    style={{
                      maxWidth: '100%',
                      maxHeight: '70vh',
                      margin: '0 auto',
                      display: 'block',
                      objectFit: 'contain',
                      borderRadius: '8px'
                    }}
                  />
                </div>
              ) : selectedDocument.pages[currentPage].url && (selectedDocument.pages[currentPage].url.startsWith('http') || selectedDocument.pages[currentPage].url.startsWith('data:') || selectedDocument.pages[currentPage].url.startsWith('blob:')) ? (
                <div
                  style={{
                    backgroundColor: '#ffffff',
                    borderRadius: '12px',
                    padding: '16px',
                    maxHeight: '80vh',
                    overflow: 'hidden',
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
                    position: 'relative',
                    zIndex: 100,
                    pointerEvents: 'auto'
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <img
                    src={selectedDocument.pages[currentPage].url}
                    alt={`Page ${currentPage + 1}`}
                    style={{
                      maxWidth: '100%',
                      maxHeight: '70vh',
                      margin: '0 auto',
                      display: 'block',
                      objectFit: 'contain',
                      borderRadius: '8px'
                    }}
                    draggable="false"
                  />
                </div>
              ) : (
                <div
                  style={{
                    backgroundColor: '#ffffff',
                    borderRadius: '12px',
                    padding: '48px',
                    minHeight: '600px',
                    maxHeight: '80vh',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '16px',
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
                    position: 'relative',
                    zIndex: 100,
                    pointerEvents: 'auto'
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div style={{
                    background: 'linear-gradient(to bottom right, #f9fafb, #f3f4f6)',
                    width: '100%',
                    maxWidth: '448px',
                    aspectRatio: '3/4',
                    borderRadius: '8px',
                    border: '2px dashed #d1d5db',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '12px'
                  }}>
                    <Image
                      style={{ width: '64px', height: '64px', color: '#9ca3af' }}
                      strokeWidth={1.5}
                    />
                    <div style={{ textAlign: 'center' }}>
                      <p style={{ fontSize: '18px', fontWeight: 500, color: '#4b5563', margin: 0 }}>No Image</p>
                      <p style={{ fontSize: '14px', color: '#9ca3af', marginTop: '4px' }}>画像が読み込めません</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* フッターエリア */}
          <div style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: '120px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '16px',
            zIndex: 200,
            background: 'linear-gradient(to top, rgba(0,0,0,0.6), transparent)',
            pointerEvents: 'none'
          }}>
            {/* 操作ヒント */}
            <div style={{
              color: 'white',
              fontSize: '14px',
              opacity: 0.6,
              textAlign: 'center'
            }}>
              <p className="hidden md:block" style={{ margin: 0 }}>
                ← ドラッグまたは矢印キーでページめくり →
              </p>
              <p className="md:hidden" style={{ margin: 0 }}>
                ← スワイプでページめくり →
              </p>
            </div>

            {/* ページインジケーター */}
            <div style={{
              display: 'flex',
              gap: '8px',
              alignItems: 'center',
              pointerEvents: 'auto'
            }}>
              {selectedDocument.pages.map((_, idx) => (
                <button
                  key={idx}
                  onClick={(e) => { e.stopPropagation(); setCurrentPage(idx); }}
                  style={{
                    height: idx === currentPage ? '10px' : '8px',
                    width: idx === currentPage ? '32px' : '8px',
                    borderRadius: '8px',
                    backgroundColor: 'white',
                    opacity: idx === currentPage ? 1 : 0.4,
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    boxShadow: idx === currentPage ? '0 0 12px rgba(255, 255, 255, 0.5)' : 'none'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.opacity = '0.8'}
                  onMouseLeave={(e) => e.currentTarget.style.opacity = idx === currentPage ? '1' : '0.4'}
                  title={`ページ ${idx + 1}へ移動`}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* アップロードモーダル */}
      {(() => {
        console.log('showUploadModal の状態:', showUploadModal);
        console.log('uploadFiles の長さ:', uploadFiles.length);
        return null;
      })()}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4" onClick={(e) => {
          console.log('モーダル背景がクリックされました');
        }}>
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6" onClick={(e) => {
            e.stopPropagation();
            console.log('モーダルコンテンツがクリックされました');
          }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-800">ファイルをアップロード</h3>
              <button
                onClick={() => setShowUploadModal(false)}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            
            {/* フォルダ選択 */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '600',
                color: '#374151',
                marginBottom: '8px'
              }}>
                保存先フォルダ
              </label>
              <select
                value={selectedUploadFolder?.id || ''}
                onChange={(e) => {
                  const allFolders = getAllFolders();
                  const folder = allFolders.find(f => f.id === e.target.value);
                  setSelectedUploadFolder(folder);
                }}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  fontSize: '14px',
                  border: '2px solid #e5e7eb',
                  borderRadius: '8px',
                  outline: 'none',
                  backgroundColor: 'white',
                  cursor: 'pointer'
                }}
              >
                {getAllFolders().length === 0 ? (
                  <option value="">フォルダがありません</option>
                ) : (
                  getAllFolders().map(folder => (
                    <option key={folder.id} value={folder.id}>
                      {folder.name}
                    </option>
                  ))
                )}
              </select>
            </div>

            <div className="space-y-4">
              {uploadFiles.map((fileData, index) => (
                <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <File className="w-5 h-5 text-blue-500" />
                  <div className="flex-1">
                    <input
                      type="text"
                      value={fileData.name}
                      onChange={(e) => {
                        const newFiles = [...uploadFiles];
                        newFiles[index].name = e.target.value;
                        setUploadFiles(newFiles);
                      }}
                      className="w-full text-sm font-medium bg-transparent border-none outline-none"
                    />
                    <p className="text-xs text-gray-500">{fileData.file.name}</p>
                  </div>
                  <div className={`w-4 h-4 rounded ${getBinderColor(fileData.color)}`} />
                </div>
              ))}
            </div>
            
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowUploadModal(false)}
                className="flex-1 px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                キャンセル
              </button>
              <button
                onClick={() => {
                  console.log('アップロードボタンがクリックされました');
                  processUploadedFiles();
                }}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                アップロード
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 新しいフォルダ作成モーダル - 改善版 */}
      {showNewFolderModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px',
          backdropFilter: 'blur(4px)'
        }}
        onClick={() => setShowNewFolderModal(false)}
        >
          <div style={{
            backgroundColor: 'white',
            borderRadius: '20px',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
            maxWidth: '480px',
            width: '100%',
            overflow: 'hidden'
          }}
          onClick={(e) => e.stopPropagation()}
          >
            {/* ヘッダー */}
            <div style={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              padding: '24px',
              color: 'white'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <FolderPlus style={{ width: '28px', height: '28px' }} />
                  <h3 style={{ fontSize: '20px', fontWeight: '700', margin: 0 }}>
                    新しいフォルダを作成
                  </h3>
                </div>
                <button
                  onClick={() => setShowNewFolderModal(false)}
                  style={{
                    background: 'rgba(255, 255, 255, 0.2)',
                    border: 'none',
                    borderRadius: '50%',
                    width: '36px',
                    height: '36px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.3)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)'}
                >
                  <X style={{ width: '20px', height: '20px', color: 'white' }} />
                </button>
              </div>
            </div>

            {/* コンテンツ */}
            <div style={{ padding: '32px' }}>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '600',
                color: '#374151',
                marginBottom: '8px'
              }}>
                フォルダ名
              </label>
              <input
                type="text"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newFolderName.trim() && selectedParentForNewFolder) {
                    createNewFolder();
                  }
                }}
                placeholder="例：重要資料"
                autoFocus
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  fontSize: '16px',
                  border: '2px solid #e5e7eb',
                  borderRadius: '12px',
                  outline: 'none',
                  transition: 'all 0.2s',
                  boxSizing: 'border-box',
                  marginBottom: '20px'
                }}
                onFocus={(e) => e.target.style.borderColor = '#6366f1'}
                onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
              />

              {/* 親フォルダ選択 */}
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '600',
                color: '#374151',
                marginBottom: '8px'
              }}>
                作成先
              </label>
              <select
                value={selectedParentForNewFolder?.id || ''}
                onChange={(e) => {
                  const parent = treeData.children.find(c => c.id === e.target.value);
                  setSelectedParentForNewFolder(parent);
                }}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  fontSize: '16px',
                  border: '2px solid #e5e7eb',
                  borderRadius: '12px',
                  outline: 'none',
                  transition: 'all 0.2s',
                  boxSizing: 'border-box',
                  backgroundColor: 'white',
                  cursor: 'pointer'
                }}
                onFocus={(e) => e.target.style.borderColor = '#6366f1'}
                onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
              >
                {treeData.children.filter(c => c.type === 'cabinet').map(cabinet => (
                  <option key={cabinet.id} value={cabinet.id}>
                    {cabinet.name}
                  </option>
                ))}
              </select>

              {/* 説明テキスト */}
              <div style={{
                marginTop: '12px',
                padding: '10px 12px',
                backgroundColor: '#f0f9ff',
                borderRadius: '8px',
                border: '1px solid #bae6fd'
              }}>
                <p style={{
                  margin: 0,
                  fontSize: '12px',
                  color: '#0369a1',
                  lineHeight: '1.5'
                }}>
                  💡 <strong>{selectedParentForNewFolder?.name || ''}</strong> の中にフォルダが作成されます
                </p>
              </div>
            </div>

            {/* フッター */}
            <div style={{
              padding: '20px 32px 32px 32px',
              display: 'flex',
              gap: '12px'
            }}>
              <button
                onClick={() => setShowNewFolderModal(false)}
                style={{
                  flex: 1,
                  padding: '12px 24px',
                  fontSize: '16px',
                  fontWeight: '600',
                  color: '#64748b',
                  backgroundColor: 'white',
                  border: '2px solid #e2e8f0',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
              >
                キャンセル
              </button>
              <button
                onClick={createNewFolder}
                disabled={!newFolderName.trim() || !selectedParentForNewFolder}
                style={{
                  flex: 1,
                  padding: '12px 24px',
                  fontSize: '16px',
                  fontWeight: '600',
                  color: 'white',
                  background: (newFolderName.trim() && selectedParentForNewFolder)
                    ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                    : '#cbd5e1',
                  border: 'none',
                  borderRadius: '12px',
                  cursor: (newFolderName.trim() && selectedParentForNewFolder) ? 'pointer' : 'not-allowed',
                  transition: 'all 0.2s',
                  boxShadow: (newFolderName.trim() && selectedParentForNewFolder) ? '0 4px 12px rgba(102, 126, 234, 0.4)' : 'none'
                }}
                onMouseEnter={(e) => {
                  if (newFolderName.trim() && selectedParentForNewFolder) {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 6px 20px rgba(102, 126, 234, 0.5)';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = (newFolderName.trim() && selectedParentForNewFolder) ? '0 4px 12px rgba(102, 126, 234, 0.4)' : 'none';
                }}
              >
                フォルダを作成
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ファイル追加モーダル - 改善版 */}
      {showFilePickerModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px',
          backdropFilter: 'blur(4px)'
        }}
        onClick={() => setShowFilePickerModal(false)}
        >
          <div style={{
            backgroundColor: 'white',
            borderRadius: '20px',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
            maxWidth: '520px',
            width: '100%',
            overflow: 'hidden'
          }}
          onClick={(e) => e.stopPropagation()}
          >
            {/* ヘッダー */}
            <div style={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              padding: '24px',
              color: 'white'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <Upload style={{ width: '28px', height: '28px' }} />
                  <h3 style={{ fontSize: '20px', fontWeight: '700', margin: 0 }}>
                    ファイルを追加
                  </h3>
                </div>
                <button
                  onClick={() => setShowFilePickerModal(false)}
                  style={{
                    background: 'rgba(255, 255, 255, 0.2)',
                    border: 'none',
                    borderRadius: '50%',
                    width: '36px',
                    height: '36px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.3)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)'}
                >
                  <X style={{ width: '20px', height: '20px', color: 'white' }} />
                </button>
              </div>
            </div>

            {/* コンテンツ */}
            <div style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* 個別ファイル選択 */}
              <button
                onClick={handleIndividualFileUpload}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px',
                  padding: '20px',
                  background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                  border: 'none',
                  borderRadius: '16px',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 8px 20px rgba(59, 130, 246, 0.4)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(59, 130, 246, 0.3)';
                }}
              >
                <div style={{
                  width: '48px',
                  height: '48px',
                  backgroundColor: 'rgba(255, 255, 255, 0.2)',
                  borderRadius: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <Upload style={{ width: '24px', height: '24px', color: 'white' }} />
                </div>
                <div style={{ textAlign: 'left', color: 'white', flex: 1 }}>
                  <div style={{ fontSize: '16px', fontWeight: '600', marginBottom: '4px' }}>
                    個別ファイルを選択
                  </div>
                  <div style={{ fontSize: '13px', opacity: 0.9 }}>
                    PDF、画像、動画、テキストなど
                  </div>
                </div>
              </button>

              {/* フォルダ一括選択 */}
              <button
                onClick={handleFolderUpload}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px',
                  padding: '20px',
                  background: 'linear-gradient(135deg, #a855f7 0%, #9333ea 100%)',
                  border: 'none',
                  borderRadius: '16px',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  boxShadow: '0 4px 12px rgba(168, 85, 247, 0.3)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 8px 20px rgba(168, 85, 247, 0.4)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(168, 85, 247, 0.3)';
                }}
              >
                <div style={{
                  width: '48px',
                  height: '48px',
                  backgroundColor: 'rgba(255, 255, 255, 0.2)',
                  borderRadius: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <FolderOpen style={{ width: '24px', height: '24px', color: 'white' }} />
                </div>
                <div style={{ textAlign: 'left', color: 'white', flex: 1 }}>
                  <div style={{ fontSize: '16px', fontWeight: '600', marginBottom: '4px' }}>
                    フォルダを一括選択
                  </div>
                  <div style={{ fontSize: '13px', opacity: 0.9 }}>
                    フォルダ内の全ファイルを一度に追加
                  </div>
                </div>
              </button>

              <div style={{
                padding: '12px',
                backgroundColor: '#f0f9ff',
                borderRadius: '12px',
                border: '1px solid #bae6fd',
                marginTop: '8px'
              }}>
                <p style={{
                  margin: 0,
                  fontSize: '13px',
                  color: '#0369a1',
                  lineHeight: '1.5'
                }}>
                  💡 <strong>複数ファイル選択可能：</strong>Ctrl（Windows）またはCmd（Mac）を押しながらクリックで複数選択できます
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* キャビネット作成モーダル */}
      {showNewCabinetModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px',
          backdropFilter: 'blur(4px)'
        }}
        onClick={() => setShowNewCabinetModal(false)}
        >
          <div style={{
            backgroundColor: 'white',
            borderRadius: '20px',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
            maxWidth: '480px',
            width: '100%',
            overflow: 'hidden'
          }}
          onClick={(e) => e.stopPropagation()}
          >
            {/* ヘッダー */}
            <div style={{
              background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
              padding: '24px',
              color: 'white'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <Book style={{ width: '28px', height: '28px' }} />
                  <h3 style={{ fontSize: '20px', fontWeight: '700', margin: 0 }}>
                    親フォルダを作成
                  </h3>
                </div>
                <button
                  onClick={() => setShowNewCabinetModal(false)}
                  style={{
                    background: 'rgba(255, 255, 255, 0.2)',
                    border: 'none',
                    borderRadius: '50%',
                    width: '36px',
                    height: '36px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.3)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)'}
                >
                  <X style={{ width: '20px', height: '20px', color: 'white' }} />
                </button>
              </div>
            </div>

            {/* コンテンツ */}
            <div style={{ padding: '32px' }}>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '600',
                color: '#374151',
                marginBottom: '8px'
              }}>
                親フォルダ名
              </label>
              <input
                type="text"
                value={newCabinetName}
                onChange={(e) => setNewCabinetName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newCabinetName.trim()) {
                    createNewCabinet();
                  }
                }}
                placeholder="例：プロジェクト資料、営業資料"
                autoFocus
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  fontSize: '16px',
                  border: '2px solid #e5e7eb',
                  borderRadius: '12px',
                  outline: 'none',
                  transition: 'all 0.2s',
                  boxSizing: 'border-box'
                }}
                onFocus={(e) => e.target.style.borderColor = '#8b5cf6'}
                onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
              />

              {/* 説明テキスト */}
              <div style={{
                marginTop: '16px',
                padding: '10px 12px',
                backgroundColor: '#faf5ff',
                borderRadius: '8px',
                border: '1px solid #e9d5ff'
              }}>
                <p style={{
                  margin: 0,
                  fontSize: '12px',
                  color: '#7c3aed',
                  lineHeight: '1.5'
                }}>
                  💡 親フォルダの中にフォルダを作成して、ドキュメントを整理できます
                </p>
              </div>
            </div>

            {/* フッター */}
            <div style={{
              padding: '20px 32px 32px 32px',
              display: 'flex',
              gap: '12px'
            }}>
              <button
                onClick={() => setShowNewCabinetModal(false)}
                style={{
                  flex: 1,
                  padding: '12px 24px',
                  fontSize: '16px',
                  fontWeight: '600',
                  color: '#64748b',
                  backgroundColor: 'white',
                  border: '2px solid #e2e8f0',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
              >
                キャンセル
              </button>
              <button
                onClick={createNewCabinet}
                disabled={!newCabinetName.trim()}
                style={{
                  flex: 1,
                  padding: '12px 24px',
                  fontSize: '16px',
                  fontWeight: '600',
                  color: 'white',
                  background: newCabinetName.trim()
                    ? 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)'
                    : '#cbd5e1',
                  border: 'none',
                  borderRadius: '12px',
                  cursor: newCabinetName.trim() ? 'pointer' : 'not-allowed',
                  transition: 'all 0.2s',
                  boxShadow: newCabinetName.trim() ? '0 4px 12px rgba(139, 92, 246, 0.4)' : 'none'
                }}
                onMouseEnter={(e) => {
                  if (newCabinetName.trim()) {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 6px 20px rgba(139, 92, 246, 0.5)';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = newCabinetName.trim() ? '0 4px 12px rgba(139, 92, 246, 0.4)' : 'none';
                }}
              >
                作成
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 削除確認モーダル */}
      {showDeleteModal && deleteTarget && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.6)',
          zIndex: 99999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px',
          backdropFilter: 'blur(4px)'
        }}
        onClick={() => setShowDeleteModal(false)}
        >
          <div style={{
            backgroundColor: 'white',
            borderRadius: '20px',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
            maxWidth: '480px',
            width: '100%',
            overflow: 'hidden'
          }}
          onClick={(e) => e.stopPropagation()}
          >
            {/* ヘッダー */}
            <div style={{
              background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
              padding: '24px',
              color: 'white'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <Trash2 style={{ width: '28px', height: '28px' }} />
                  <h3 style={{ fontSize: '20px', fontWeight: '700', margin: 0 }}>
                    {deleteTarget.type === 'folder' ? 'フォルダを削除' : 'ドキュメントを削除'}
                  </h3>
                </div>
                <button
                  onClick={() => setShowDeleteModal(false)}
                  style={{
                    background: 'rgba(255, 255, 255, 0.2)',
                    border: 'none',
                    borderRadius: '50%',
                    width: '36px',
                    height: '36px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.3)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)'}
                >
                  <X style={{ width: '20px', height: '20px', color: 'white' }} />
                </button>
              </div>
            </div>

            {/* コンテンツ */}
            <div style={{ padding: '32px' }}>
              <div style={{
                padding: '16px',
                backgroundColor: '#fef2f2',
                borderRadius: '12px',
                border: '1px solid #fecaca',
                marginBottom: '24px'
              }}>
                <p style={{
                  margin: 0,
                  fontSize: '15px',
                  color: '#991b1b',
                  lineHeight: '1.6'
                }}>
                  <strong>{deleteTarget.name}</strong> を削除しようとしています。
                  {deleteTarget.type === 'folder' && <span><br />フォルダ内のすべてのドキュメントも削除されます。</span>}
                  <br />この操作は取り消せません。
                </p>
              </div>

              {/* ボタン */}
              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  onClick={() => setShowDeleteModal(false)}
                  style={{
                    flex: 1,
                    padding: '14px 24px',
                    backgroundColor: '#f3f4f6',
                    border: 'none',
                    borderRadius: '12px',
                    fontSize: '15px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    color: '#374151'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#e5e7eb';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#f3f4f6';
                  }}
                >
                  キャンセル
                </button>
                <button
                  onClick={executeDelete}
                  style={{
                    flex: 1,
                    padding: '14px 24px',
                    background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                    border: 'none',
                    borderRadius: '12px',
                    fontSize: '15px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    color: 'white',
                    boxShadow: '0 4px 12px rgba(239, 68, 68, 0.3)'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-1px)';
                    e.currentTarget.style.boxShadow = '0 6px 16px rgba(239, 68, 68, 0.4)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(239, 68, 68, 0.3)';
                  }}
                >
                  削除する
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 非表示のファイル入力 - ドラッグ&ドロップゾーンクリック用 */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".pdf,.jpg,.jpeg,.png,.heic,.txt,.mp4,.mov,.avi,.webp,.gif,.bmp,.docx,.doc,.xlsx,.xls,.csv,.json,.html,.htm,.md,.markdown,image/*,video/*,application/pdf,text/*,application/json,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv,text/html,text/markdown"
        style={{ display: 'none' }}
        onChange={handleFileUpload}
      />
    </>
  );
};

export default DocumentLibrary;
