import { inject, injectable } from 'tsyringe';

import AppError from '@shared/errors/AppError';

import Product from '../infra/typeorm/entities/Product';
import IProductsRepository from '../repositories/IProductsRepository';

interface IRequest {
  name: string;
  price: number;
  quantity: number;
}

@injectable()
class CreateProductService {
  constructor(
    @inject('ProductsRepository')
    private productsRepository: IProductsRepository,
  ) {}

  public async execute({ name, price, quantity }: IRequest): Promise<Product> {
    const existentProduct = await this.productsRepository.findByName(name);

    if (existentProduct) {
      throw new AppError('A product already exist with this name.', 400);
    }

    const product = await this.productsRepository.create({
      price,
      name,
      quantity,
    });

    return product;
  }
}

export default CreateProductService;
