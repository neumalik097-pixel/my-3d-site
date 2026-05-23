import DashboardShell from "@/components/dashboard/shell"
import { ProductsClient } from "@/components/products/products-client"

export default function ProductsPage() {
  return (
    <DashboardShell>
      <ProductsClient />
    </DashboardShell>
  )
}
