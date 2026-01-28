export class ApiResponse<T = null> {
  public statusCode: number;
  public message: string;
  public data: T | null;

  constructor(statusCode: number, message: string, data: T | null = null) {
    this.statusCode = statusCode;
    this.message = message;
    this.data = data;
  }
}
