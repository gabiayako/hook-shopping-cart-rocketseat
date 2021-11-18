import {
  createContext,
  ReactNode,
  useContext,
  useState,
  useEffect,
} from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart');

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const loadProduct = async (productId: number) =>
    await api.get(`/products/${String(productId)}`).then((res) => res.data);

  const loadStockProduct = async (productId: number) =>
    await api.get(`/stock/${String(productId)}`).then((res) => res.data);

  const addProduct = async (productId: number) => {
    try {
      const product = await api.get(`/products/${productId}`);
      const productStock = await loadStockProduct(productId);
      setCart((prevCart) => {
        const cartProduct = prevCart.find((p) => p.id === productId);

        if (!!cartProduct) {
          if (!!productStock && cartProduct.amount < productStock.amount) {
            const newCartWithoutSelectedProduct = prevCart.filter(
              (p) => p.id !== productId
            );
            const newCart = [
              ...newCartWithoutSelectedProduct,
              {
                ...cartProduct,
                amount: cartProduct.amount + 1,
              },
            ];
            localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart));
            return newCart;
          } else {
            toast.error('Quantidade solicitada fora de estoque');
            return prevCart;
          }
        } else {
          const newCart = [...prevCart, { ...product.data, amount: 1 }];
          localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart));
          return newCart;
        }
      });
    } catch (err) {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = async (productId: number) => {
    try {
      setCart((prevCart) => {
        if (prevCart.filter((p) => p.id === productId).length) {
          const newCart = prevCart.filter((p) => p.id !== productId);
          localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart));
          return newCart;
        } else {
          toast.error('Erro na remoção do produto');
          return prevCart;
        }
      });
    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      const productStock = await loadStockProduct(productId);

      setCart((prevCart) => {
        if (amount <= 0 || (productStock && amount > productStock.amount)) {
          toast.error('Quantidade solicitada fora de estoque');
          return prevCart;
        }

        const newCart = prevCart.map((p) => {
          if (p.id !== productId) {
            return p;
          } else {
            return {
              ...p,
              amount,
            };
          }
        });
        localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart));

        return newCart;
      });
    } catch {
      toast.error('Erro na alteração de quantidade do produto');
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
