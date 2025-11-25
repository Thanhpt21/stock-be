export class OrderResponseDto {
  id: number;
  orderId: string;
  accountId: number;
  symbol: string;
  orderType: string;
  side: string;
  quantity: number;
  price?: number;
  stopPrice?: number;
  status: string;
  filledQuantity: number;
  averagePrice?: number;
  orderDate: Date;
  executions: ExecutionResponseDto[];

  constructor(order: any) {
    this.id = order.id;
    this.orderId = order.orderId;
    this.accountId = order.accountId;
    this.symbol = order.symbol;
    this.orderType = order.orderType;
    this.side = order.side;
    this.quantity = order.quantity;
    this.price = order.price ? Number(order.price) : undefined;
    this.stopPrice = order.stopPrice ? Number(order.stopPrice) : undefined;
    this.status = order.status;
    this.filledQuantity = order.filledQuantity;
    this.averagePrice = order.averagePrice ? Number(order.averagePrice) : undefined;
    this.orderDate = order.orderDate;
    this.executions = order.executions?.map(exec => new ExecutionResponseDto(exec)) || [];
  }
}

export class ExecutionResponseDto {
  id: number;
  quantity: number;
  price: number;
  executionTime: Date;
  commission: number;
  tax: number;

  constructor(execution: any) {
    this.id = execution.id;
    this.quantity = execution.quantity;
    this.price = Number(execution.price);
    this.executionTime = execution.executionTime;
    this.commission = Number(execution.commission);
    this.tax = Number(execution.tax);
  }
}