import { inject, injectable } from 'tsyringe';

import AppError from '@shared/errors/AppError';

import IProductsRepository from '@modules/products/repositories/IProductsRepository';
import ICustomersRepository from '@modules/customers/repositories/ICustomersRepository';
import Order from '../infra/typeorm/entities/Order';
import IOrdersRepository from '../repositories/IOrdersRepository';

interface IProduct {
  id: string;
  quantity: number;
}

interface IRequest {
  customer_id: string;
  products: IProduct[];
}

@injectable()
class CreateOrderService {
  constructor(
    @inject('OrdersRepository')
    private ordersRepository: IOrdersRepository,
    @inject('ProductsRepository')
    private productsRepository: IProductsRepository,
    @inject('CustomersRepository')
    private customersRepository: ICustomersRepository,
  ) {}

  public async execute({ customer_id, products }: IRequest): Promise<Order> {
    const customerPromise = this.customersRepository.findById(customer_id);
    const productsPromises = this.productsRepository.findAllById(products);

    const [customer, productsFound] = await Promise.all([
      customerPromise,
      productsPromises,
    ]);

    if (!customer) {
      throw new AppError('No customer found.', 400);
    }

    if (!productsFound || !productsFound.length) {
      throw new AppError('Invalid list of products.');
    }

    productsFound.forEach(productFound => {
      const orderedProduct = products.find(p => p.id === productFound.id);

      if (!productFound) {
        throw new AppError('Product not found.', 404);
      }

      if (productFound.quantity < Number(orderedProduct?.quantity)) {
        throw new AppError('Cannot order more than the stock.');
      }
    });

    const parsedOrderedProducts = products.map(product => {
      const productFound = productsFound.find(pF => pF.id === product.id);

      if (!productFound) throw new AppError('Invalid products list');

      return {
        product_id: product.id,
        quantity: product.quantity,
        price: productFound.price,
      };
    });

    const updatedQuantities = productsFound.map(productFound => {
      const orderedProduct = products.find(p => p.id === productFound.id);

      return {
        ...productFound,
        quantity: productFound.quantity - Number(orderedProduct?.quantity),
      };
    });

    const order = await this.ordersRepository.create({
      customer,
      products: parsedOrderedProducts,
    });

    await this.productsRepository.updateQuantity(updatedQuantities);

    return order;
  }
}

export default CreateOrderService;
