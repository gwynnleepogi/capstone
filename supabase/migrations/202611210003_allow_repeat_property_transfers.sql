-- A receipt may have multiple transfer-history rows over its lifetime.
-- Remove a single-column UNIQUE constraint on property_receipt_id if the
-- database has one, because that would prevent the current holder from
-- transferring the same property again after a previous transfer is approved.
DO $$
DECLARE
  constraint_row record;
  index_row record;
BEGIN
  FOR constraint_row IN
    SELECT con.conname
    FROM pg_constraint con
    JOIN pg_class tbl ON tbl.oid = con.conrelid
    JOIN pg_namespace ns ON ns.oid = tbl.relnamespace
    WHERE ns.nspname = 'public'
      AND tbl.relname = 'item_transfers'
      AND con.contype = 'u'
      AND (
        SELECT array_agg(att.attname ORDER BY key_column.ordinality)
        FROM unnest(con.conkey) WITH ORDINALITY AS key_column(attnum, ordinality)
        JOIN pg_attribute att
          ON att.attrelid = tbl.oid
         AND att.attnum = key_column.attnum
      ) = ARRAY['property_receipt_id']::name[]
  LOOP
    EXECUTE format(
      'ALTER TABLE public.item_transfers DROP CONSTRAINT %I',
      constraint_row.conname
    );
  END LOOP;

  FOR index_row IN
    SELECT idx.relname AS index_name
    FROM pg_index ind
    JOIN pg_class tbl ON tbl.oid = ind.indrelid
    JOIN pg_namespace ns ON ns.oid = tbl.relnamespace
    JOIN pg_class idx ON idx.oid = ind.indexrelid
    JOIN pg_attribute att
      ON att.attrelid = tbl.oid
     AND att.attnum = ind.indkey[0]
    WHERE ns.nspname = 'public'
      AND tbl.relname = 'item_transfers'
      AND ind.indisunique
      AND NOT ind.indisprimary
      AND ind.indnatts = 1
      AND att.attname = 'property_receipt_id'
      AND NOT EXISTS (
        SELECT 1
        FROM pg_constraint con
        WHERE con.conindid = ind.indexrelid
      )
  LOOP
    EXECUTE format(
      'DROP INDEX IF EXISTS public.%I',
      index_row.index_name
    );
  END LOOP;
END $$;
