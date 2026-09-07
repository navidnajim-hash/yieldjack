import { AddressDisplay } from "./AddressDisplay";

export function ContractStatusRow({
  name,
  description,
  address,
}: {
  name: string;
  description: string;
  address: string | null;
}) {
  return (
    <div className="flex flex-col gap-2 border-b border-border py-4 last:border-b-0 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
      <div className="flex flex-col gap-0.5">
        <span className="text-sm font-medium text-foreground">{name}</span>
        <span className="text-xs text-muted">{description}</span>
      </div>
      <div className="sm:w-72">
        <AddressDisplay address={address} label={address ? "Address" : "Pending deployment"} />
      </div>
    </div>
  );
}
