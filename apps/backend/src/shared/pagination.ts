export type PaginationInput<PageSize extends number = number> = {
  page: number;
  pageSize: PageSize;
  totalItems: number;
};

export type Pagination<PageSize extends number = number> = PaginationInput<PageSize> & {
  offset: number;
  totalPages: number;
};

export function calculatePagination<PageSize extends number>({
  page,
  pageSize,
  totalItems,
}: PaginationInput<PageSize>): Pagination<PageSize> {
  return {
    page,
    pageSize,
    totalItems,
    offset: (page - 1) * pageSize,
    totalPages: Math.ceil(totalItems / pageSize),
  };
}
