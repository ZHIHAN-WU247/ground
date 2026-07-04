import Link from "next/link";
import { ShoppingBag, Truck } from "lucide-react";

const logisticsTags = ["物流报价", "订单管理", "实时追踪"];
const shopTags = ["精选好物", "全球直邮", "品质保障"];

export default function HomePage() {
  return (
    <section className="shell home-hero-page">
      <div className="home-hero-copy">
        <h1 className="home-hero-title">
          <span>连接世界，</span>
          <span className="home-hero-title-accent">触手可及</span>
        </h1>
      </div>

      <div className="home-hero-cta-row">
        <Link className="home-hero-cta home-hero-cta-dark" href="/logistics">
          <Truck aria-hidden="true" />
          <span>Ground物流</span>
        </Link>
        <Link className="home-hero-cta home-hero-cta-accent" href="/shop">
          <ShoppingBag aria-hidden="true" />
          <span>Ground商城</span>
        </Link>
      </div>

      <div className="home-feature-grid">
        <Link className="home-feature-card home-feature-card-logistics" href="/logistics">
          <h2>Ground Express</h2>
          <div className="home-feature-tags" aria-label="Ground Express features">
            {logisticsTags.map((tag) => (
              <span className="home-feature-tag" key={tag}>
                {tag}
              </span>
            ))}
          </div>
        </Link>

        <Link className="home-feature-card home-feature-card-shop" href="/shop">
          <h2>Ground Shopping</h2>
          <div className="home-feature-tags" aria-label="Ground Shopping features">
            {shopTags.map((tag) => (
              <span className="home-feature-tag" key={tag}>
                {tag}
              </span>
            ))}
          </div>
        </Link>
      </div>
    </section>
  );
}
