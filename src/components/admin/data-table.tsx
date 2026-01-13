'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export interface Column<T> {
  key: string;
  header: string | React.ReactNode;
  cell?: (row: T) => React.ReactNode;
  sortable?: boolean;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
  onPageChange?: (page: number) => void;
  onLimitChange?: (limit: number) => void;
  searchable?: boolean;
  onSearch?: (search: string) => void;
  actions?: (row: T) => React.ReactNode;
  selectable?: boolean;
  selectedRows?: string[];
  onSelectionChange?: (selectedIds: string[]) => void;
  getRowId?: (row: T) => string;
  bulkActions?: React.ReactNode;
}

export function DataTable<T extends Record<string, any>>({
  columns,
  data,
  loading = false,
  pagination,
  onPageChange,
  onLimitChange,
  searchable = false,
  onSearch,
  actions,
  selectable = false,
  selectedRows = [],
  onSelectionChange,
  getRowId = (row: T) => row._id || row.id || '',
  bulkActions,
}: DataTableProps<T>) {
  const [searchTerm, setSearchTerm] = useState('');
  const [internalSelectedRows, setInternalSelectedRows] = useState<string[]>([]);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [scrollState, setScrollState] = useState({ left: false, right: false });
  
  const selectedIds = selectedRows.length > 0 ? selectedRows : internalSelectedRows;
  
  // Check scroll position to show/hide scroll shadows
  useEffect(() => {
    const checkScroll = () => {
      if (scrollContainerRef.current) {
        const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
        setScrollState({
          left: scrollLeft > 0,
          right: scrollLeft < scrollWidth - clientWidth - 1,
        });
      }
    };
    
    const container = scrollContainerRef.current;
    if (container) {
      checkScroll();
      container.addEventListener('scroll', checkScroll);
      // Check on resize
      const resizeObserver = new ResizeObserver(checkScroll);
      resizeObserver.observe(container);
      
      return () => {
        container.removeEventListener('scroll', checkScroll);
        resizeObserver.disconnect();
      };
    }
  }, [data]);

  useEffect(() => {
    if (searchable && onSearch) {
      const timeoutId = setTimeout(() => {
        onSearch(searchTerm);
      }, 800); // Increased debounce from 300ms to 800ms to reduce API calls
      return () => clearTimeout(timeoutId);
    }
  }, [searchTerm, onSearch, searchable]);

  // For server-side search, use data as-is (filtering happens on server)
  const filteredData = data;
  
  const handleSelectAll = (checked: boolean) => {
    const currentPageIds = filteredData.map(row => getRowId(row));
    if (checked) {
      const newSelection = [...new Set([...selectedIds, ...currentPageIds])];
      setInternalSelectedRows(newSelection);
      onSelectionChange?.(newSelection);
    } else {
      const newSelection = selectedIds.filter(id => !currentPageIds.includes(id));
      setInternalSelectedRows(newSelection);
      onSelectionChange?.(newSelection);
    }
  };
  
  const handleSelectRow = (rowId: string, checked: boolean) => {
    if (checked) {
      const newSelection = [...selectedIds, rowId];
      setInternalSelectedRows(newSelection);
      onSelectionChange?.(newSelection);
    } else {
      const newSelection = selectedIds.filter(id => id !== rowId);
      setInternalSelectedRows(newSelection);
      onSelectionChange?.(newSelection);
    }
  };

  const isAllSelected = filteredData.length > 0 && filteredData.every(row => selectedIds.includes(getRowId(row)));
  const isSomeSelected = filteredData.some(row => selectedIds.includes(getRowId(row)));

  if (loading) {
    return (
      <div className="space-y-4 w-full max-w-full overflow-x-hidden">
        {bulkActions && selectedIds.length > 0 && (
          <div className="flex items-center gap-2 p-2 bg-muted rounded-md">
            {bulkActions}
          </div>
        )}
        <div className="rounded-md border overflow-hidden w-full relative">
          <div 
            className="overflow-x-auto scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-200"
            style={{ scrollbarWidth: 'thin' }}
          >
            <Table>
              <TableHeader>
                <TableRow>
                  {selectable && <TableHead className="w-12"><Skeleton className="h-4 w-4" /></TableHead>}
                  {columns.map((col) => (
                    <TableHead key={col.key} className="whitespace-nowrap">{col.header}</TableHead>
                  ))}
                  {actions && <TableHead className="whitespace-nowrap">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {selectable && <TableCell className="w-12"><Skeleton className="h-4 w-4" /></TableCell>}
                    {columns.map((col) => (
                      <TableCell key={col.key} className="whitespace-nowrap">
                        <Skeleton className="h-4 w-full" />
                      </TableCell>
                    ))}
                    {actions && (
                      <TableCell className="whitespace-nowrap">
                        <Skeleton className="h-4 w-20" />
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 mt-4 w-full max-w-full overflow-x-hidden">
      {bulkActions && selectedIds.length > 0 && (
        <div className="flex items-center gap-2 p-3 bg-muted rounded-md border">
          <span className="text-sm font-medium">
            {selectedIds.length} item{selectedIds.length !== 1 ? 's' : ''} selected
          </span>
          {bulkActions}
        </div>
      )}
      
      {searchable && (
        <div className="flex items-center gap-4 p-2">
          <Input
            placeholder="Search..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-sm"
          />
        </div>
      )}

      <div className="rounded-md border overflow-hidden w-full relative">
        <div 
          ref={scrollContainerRef}
          className={`overflow-x-auto scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-200 scroll-container ${scrollState.left ? 'scrollable-left' : ''} ${scrollState.right ? 'scrollable-right' : ''}`}
          style={{ scrollbarWidth: 'thin' }}
        >
          <Table>
            <TableHeader>
              <TableRow>
                {selectable && (
                  <TableHead className="w-12">
                    <Checkbox
                      checked={isAllSelected}
                      onCheckedChange={handleSelectAll}
                      aria-label="Select all"
                    />
                  </TableHead>
                )}
                {columns.map((col) => (
                  <TableHead key={col.key} className="whitespace-nowrap">{col.header}</TableHead>
                ))}
                {actions && <TableHead className="whitespace-nowrap">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={columns.length + (selectable ? 1 : 0) + (actions ? 1 : 0)} className="h-24 text-center">
                    {searchTerm ? 'No results found.' : 'No results.'}
                  </TableCell>
                </TableRow>
              ) : (
                filteredData.map((row, index) => {
                  const rowId = getRowId(row);
                  const isSelected = selectedIds.includes(rowId);
                  return (
                    <TableRow key={rowId || index} className={isSelected ? 'bg-muted/50' : ''}>
                      {selectable && (
                        <TableCell className="w-12">
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={(checked) => handleSelectRow(rowId, checked as boolean)}
                            aria-label={`Select row ${index + 1}`}
                          />
                        </TableCell>
                      )}
                      {columns.map((col) => (
                        <TableCell key={col.key} className="whitespace-nowrap">
                          {col.cell ? col.cell(row) : row[col.key]}
                        </TableCell>
                      ))}
                      {actions && <TableCell className="whitespace-nowrap">{actions(row)}</TableCell>}
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {pagination && pagination.pages > 1 && (() => {
        const currentPage = pagination.page;
        const totalPages = pagination.pages;
        
        // Calculate which page numbers to show
        const getPageNumbers = () => {
          const pages: (number | string)[] = [];
          
          if (totalPages <= 7) {
            // Show all pages if 7 or fewer
            for (let i = 1; i <= totalPages; i++) {
              pages.push(i);
            }
          } else {
            // Always show first page
            pages.push(1);
            
            if (currentPage <= 3) {
              // Near the beginning
              for (let i = 2; i <= 5; i++) {
                pages.push(i);
              }
              pages.push('ellipsis');
              pages.push(totalPages);
            } else if (currentPage >= totalPages - 2) {
              // Near the end
              pages.push('ellipsis');
              for (let i = totalPages - 4; i <= totalPages; i++) {
                pages.push(i);
              }
            } else {
              // In the middle
              pages.push('ellipsis');
              for (let i = currentPage - 1; i <= currentPage + 1; i++) {
                pages.push(i);
              }
              pages.push('ellipsis');
              pages.push(totalPages);
            }
          }
          
          return pages;
        };
        
        const pageNumbers = getPageNumbers();
        
        return (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <p className="text-sm text-muted-foreground">
                Showing {((pagination.page - 1) * pagination.limit) + 1} to{' '}
                {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
                {pagination.total} results
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Select
                value={pagination.limit.toString()}
                onValueChange={(value) => onLimitChange?.(Number(value))}
              >
                <SelectTrigger className="w-20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="20">20</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => onPageChange?.(1)}
                  disabled={currentPage === 1}
                >
                  <ChevronsLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => onPageChange?.(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                {pageNumbers.map((page, index) => {
                  if (page === 'ellipsis') {
                    return (
                      <span key={`ellipsis-${index}`} className="px-2 text-muted-foreground">
                        ...
                      </span>
                    );
                  }
                  const pageNum = page as number;
                  return (
                    <Button
                      key={pageNum}
                      variant={currentPage === pageNum ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => onPageChange?.(pageNum)}
                      className="min-w-[2.5rem]"
                    >
                      {pageNum}
                    </Button>
                  );
                })}
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => onPageChange?.(currentPage + 1)}
                  disabled={currentPage >= totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => onPageChange?.(totalPages)}
                  disabled={currentPage >= totalPages}
                >
                  <ChevronsRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

