import { describe, expect, it } from "vitest";
import { vehicleSize } from "./vehicle-size";

describe("vehicleSize", () => {
  it("седаны, купе — sedan; обычные SUV — suv; трёхрядные — big", () => {
    expect(vehicleSize("sedan", "Toyota", "Camry")).toBe("sedan");
    expect(vehicleSize("coupe", "BMW", "4 Series")).toBe("sedan");
    expect(vehicleSize("suv", "Toyota", "RAV4")).toBe("suv");
    expect(vehicleSize("suv", "BMW", "X5 M")).toBe("suv");
    expect(vehicleSize("suv", "BMW", "X7")).toBe("big");
    expect(vehicleSize("suv", "Audi", "Q7")).toBe("big");
    expect(vehicleSize("suv", "Ford", "Explorer")).toBe("big");
    expect(vehicleSize("suv", "Mercedes", "GLS 450")).toBe("big");
  });
  it("Range Rover полный — big, Sport/Velar/Evoque — suv", () => {
    expect(vehicleSize("suv", "Land Rover", "Range Rover")).toBe("big");
    expect(vehicleSize("suv", "Land Rover", "Range Rover Sport")).toBe("suv");
    expect(vehicleSize("suv", "Land Rover", "Range Rover Evoque")).toBe("suv");
  });
});
