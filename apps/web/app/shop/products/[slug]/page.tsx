import { ProductDetailLoader } from "./ProductDetailLoader";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function ProductDetailPage({ params }: PageProps) {
  const { slug } = await params;
  return <main className="shell section"><ProductDetailLoader slug={slug} /></main>;
}
