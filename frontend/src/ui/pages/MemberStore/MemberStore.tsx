import { Button } from 'antd';
import { ShoppingCartOutlined, FireOutlined, SkinOutlined } from '@ant-design/icons';
import { LockedFeature, showComingSoonModal } from '@/ui/components/LockedFeature';
import styles from './MemberStore.module.css';

interface MemberProduct {
  id: string;
  name: string;
  category: 'Suplementos' | 'Ropa';
  price: number;
  stockState: 'normal' | 'low_stock' | 'out_of_stock';
  iconType: 'supplement' | 'apparel';
}

const MEMBER_PRODUCTS: MemberProduct[] = [
  {
    id: 'mp-1',
    name: 'Whey Protein 1kg',
    category: 'Suplementos',
    price: 85000,
    stockState: 'normal',
    iconType: 'supplement',
  },
  {
    id: 'mp-2',
    name: 'Creatina 300g',
    category: 'Suplementos',
    price: 65000,
    stockState: 'normal',
    iconType: 'supplement',
  },
  {
    id: 'mp-3',
    name: 'Camiseta Dry-Fit',
    category: 'Ropa',
    price: 45000,
    stockState: 'normal',
    iconType: 'apparel',
  },
  {
    id: 'mp-4',
    name: 'BCAA 200g',
    category: 'Suplementos',
    price: 55000,
    stockState: 'low_stock',
    iconType: 'supplement',
  },
  {
    id: 'mp-5',
    name: 'Licra Deportiva',
    category: 'Ropa',
    price: 75000,
    stockState: 'out_of_stock',
    iconType: 'apparel',
  },
];

export function MemberStore() {
  return (
    <div className={styles['member-store']} role="region" aria-label="Tienda Oficial">
      <LockedFeature.Section
        title="Tienda Oficial Platinum Center"
        description="Adquiere tus suplementos, hidratación y ropa deportiva favorita directamente desde tu portal con entrega inmediata en recepción."
        comingSoon={false}
      >
        <div className={styles['member-store__header']}>
          <h1 className={styles['member-store__title']}>Tienda Oficial</h1>
          <p className={styles['member-store__subtitle']}>
            Suplementos y ropa deportiva exclusiva para socios de Platinum Center.
          </p>
        </div>

        <div className={styles['member-store__grid']}>
          {MEMBER_PRODUCTS.map((prod) => {
            const isOutOfStock = prod.stockState === 'out_of_stock';
            const isLowStock = prod.stockState === 'low_stock';

            return (
              <div key={prod.id} className={styles['member-store__card']}>
                <div className={styles['member-store__image-container']}>
                  {prod.iconType === 'supplement' ? (
                    <FireOutlined className={styles['member-store__product-icon']} />
                  ) : (
                    <SkinOutlined className={styles['member-store__product-icon']} />
                  )}

                  {isLowStock && (
                    <span
                      className={`${styles['member-store__badge']} ${styles['member-store__badge--low-stock']}`}
                    >
                      Bajo stock
                    </span>
                  )}

                  {isOutOfStock && (
                    <span
                      className={`${styles['member-store__badge']} ${styles['member-store__badge--out-of-stock']}`}
                    >
                      Agotado
                    </span>
                  )}
                </div>

                <div className={styles['member-store__info']}>
                  <span className={styles['member-store__product-category']}>
                    {prod.category}
                  </span>
                  <h2 className={styles['member-store__product-name']}>{prod.name}</h2>
                  <div className={styles['member-store__price-row']}>
                    <span className={styles['member-store__price']}>
                      ${prod.price.toLocaleString('es-CO')}
                    </span>
                  </div>
                </div>

                <Button
                  type="primary"
                  disabled={isOutOfStock}
                  onClick={() => showComingSoonModal()}
                  icon={<ShoppingCartOutlined />}
                  className={styles['member-store__action-btn']}
                >
                  {isOutOfStock ? 'Agotado' : 'Agregar al carrito'}
                </Button>
              </div>
            );
          })}
        </div>
      </LockedFeature.Section>
    </div>
  );
}

export default MemberStore;
