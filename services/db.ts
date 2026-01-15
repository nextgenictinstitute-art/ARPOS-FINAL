
import { Product, Sale, Purchase, ShopProfile, Customer } from '../types';
import { INITIAL_PRODUCTS } from '../constants';

const DB_NAME = 'ARPrintersDB';
const DB_VERSION = 2; // Incremented for Customer store

const DEFAULT_PROFILE: ShopProfile = {
  name: 'AR PRINTERS',
  address: 'Mukkarawewa, Horowpothana',
  phone: '0778824235',
  email: 'arprintersmk@gmail.com',
  footerNote: 'Thank you for your business!',
  logo: ''
};

const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      
      if (!db.objectStoreNames.contains('products')) {
        const prodStore = db.createObjectStore('products', { keyPath: 'id' });
        INITIAL_PRODUCTS.forEach(p => prodStore.add(p));
      }
      
      if (!db.objectStoreNames.contains('sales')) {
        db.createObjectStore('sales', { keyPath: 'id' });
      }
      
      if (!db.objectStoreNames.contains('purchases')) {
        db.createObjectStore('purchases', { keyPath: 'id' });
      }
      
      if (!db.objectStoreNames.contains('settings')) {
        const settingsStore = db.createObjectStore('settings', { keyPath: 'id' });
        settingsStore.add({ id: 'profile', ...DEFAULT_PROFILE });
      }

      if (!db.objectStoreNames.contains('customers')) {
        db.createObjectStore('customers', { keyPath: 'id' });
      }
    };
  });
};

const getAll = async <T>(storeName: string): Promise<T[]> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readonly');
    const store = transaction.objectStore(storeName);
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

const putItem = async <T>(storeName: string, item: T): Promise<void> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.put(item);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

const deleteItem = async (storeName: string, key: string): Promise<void> => {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.delete(key);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
};

export const db = {
  getProducts: () => getAll<Product>('products'),
  addProduct: (product: Product) => putItem('products', product),
  updateProduct: (product: Product) => putItem('products', product),

  getCustomers: () => getAll<Customer>('customers'),
  addCustomer: (customer: Customer) => putItem('customers', customer),
  updateCustomer: (customer: Customer) => putItem('customers', customer),
  deleteCustomer: (id: string) => deleteItem('customers', id),

  getSales: () => getAll<Sale>('sales'),
  saveSale: async (sale: Sale): Promise<void> => {
    const db = await openDB();
    const transaction = db.transaction(['sales', 'products'], 'readwrite');
    const salesStore = transaction.objectStore('sales');
    salesStore.add(sale);

    const productStore = transaction.objectStore('products');
    for (const item of sale.items) {
        const request = productStore.get(item.id);
        request.onsuccess = () => {
            const product = request.result as Product;
            if (product) {
                product.stock -= item.quantity;
                productStore.put(product);
            }
        };
    }
    return new Promise((resolve, reject) => {
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
    });
  },
  updateSale: (updatedSale: Sale) => putItem('sales', updatedSale),

  getPurchases: () => getAll<Purchase>('purchases'),
  savePurchase: async (purchase: Purchase): Promise<void> => {
    const db = await openDB();
    const transaction = db.transaction(['purchases', 'products'], 'readwrite');
    const purchaseStore = transaction.objectStore('purchases');
    purchaseStore.add(purchase);

    const productStore = transaction.objectStore('products');
    for (const item of purchase.items) {
        const request = productStore.get(item.productId);
        request.onsuccess = () => {
            const product = request.result as Product;
            if (product) {
                product.stock += item.quantity;
                product.cost = item.unitCost;
                productStore.put(product);
            }
        };
    }
    return new Promise((resolve, reject) => {
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
    });
  },

  getShopProfile: async (): Promise<ShopProfile> => {
    const db = await openDB();
    const transaction = db.transaction('settings', 'readonly');
    const store = transaction.objectStore('settings');
    const request = store.get('profile');
    return new Promise((resolve, reject) => {
        request.onsuccess = () => {
            const profile = request.result;
            if (profile) {
                const { id, ...rest } = profile;
                resolve(rest as ShopProfile);
            } else {
                resolve(DEFAULT_PROFILE);
            }
        };
        request.onerror = () => reject(request.error);
    });
  },
  saveShopProfile: (profile: ShopProfile) => putItem('settings', { id: 'profile', ...profile })
};
