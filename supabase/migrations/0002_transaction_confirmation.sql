-- GoFI — on-chain confirmation trail for transactions.
--
-- Recording only "confirmed" loses the two things that make the trail
-- auditable: which block included it, and when we observed that. Both are
-- nullable because a transaction is inserted before it is mined.

alter table public.transactions
  add column if not exists block_number  bigint,
  add column if not exists confirmed_at  timestamptz,
  add column if not exists failure_reason text;

-- Reconciliation scans for still-pending rows, so index exactly that.
create index if not exists transactions_pending_idx
  on public.transactions (created_at)
  where status = 'pending';
