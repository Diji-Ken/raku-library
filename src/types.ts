// 楽々ライブラリの型定義

export interface DocumentPage {
  type?: string;
  pageNumber?: number;
  content?: string;
  thumbnail?: string;
  url?: string;
}

export interface DocumentNode {
  id: string;
  name: string;
  type: 'document';
  color?: string;
  pages: DocumentPage[];
  pdfUrl?: string;
  file?: File;
  originalFile?: File;
  fileType?: string;
  numPages?: number; // PDFの総ページ数
}

export interface FolderNode {
  id: string;
  name: string;
  type: 'folder';
  expanded: boolean;
  children: (DocumentNode | FolderNode)[];
  color?: string; // オプショナル：フォルダの色
}

export interface CabinetNode {
  id: string;
  name: string;
  type: 'cabinet';
  expanded: boolean;
  children: FolderNode[];
  color?: string; // オプショナル：キャビネットの色
}

export interface LibraryData {
  name: string;
  children: CabinetNode[];
}

export type TreeNode = CabinetNode | FolderNode | DocumentNode;

export interface ColorOption {
  name: string;
  value: string;
}

export interface Breadcrumb {
  name: string;
  id: string | null;
}

export interface DeleteTarget {
  type: 'folder' | 'document' | 'cabinet';
  id: string;
  name: string;
}

export interface DragState {
  isDragging: boolean;
  startX: number;
  currentX: number;
  translateX: number;
  startTime: number;
  lastX: number;
  lastTime: number;
}
