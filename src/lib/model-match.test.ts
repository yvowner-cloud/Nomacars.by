import { describe, expect, it } from "vitest";
import { matchModel } from "./model-match";

const T = [
  { id: 1, make: "Toyota", model: "RAV4" }, { id: 2, make: "Mazda", model: "CX-5" }, { id: 3, make: "Mazda", model: "CX-50" },
  { id: 4, make: "BMW", model: "X5" }, { id: 5, make: "Mercedes-Benz", model: "GLC" }, { id: 6, make: "Land Rover", model: "Range Rover" },
  { id: 7, make: "Land Rover", model: "Range Rover Sport" }, { id: 8, make: "Tesla", model: "Model 3" }, { id: 9, make: "Tesla", model: "Model Y" },
];

describe("matchModel", () => {
  it("гибрид и M-версия относятся к базовой модели", () => {
    expect(matchModel("Toyota", "RAV4 Hybrid", T)?.id).toBe(1);
    expect(matchModel("BMW", "X5 M", T)?.id).toBe(4);
  });
  it("берёт самое длинное совпадение", () => {
    expect(matchModel("Mazda", "CX-50", T)?.id).toBe(3);
    expect(matchModel("Mazda", "CX5", T)?.id).toBe(2);
    expect(matchModel("Land Rover", "Range Rover Sport HSE", T)?.id).toBe(7);
  });
  it("понимает разные написания марок", () => {
    expect(matchModel("Mercedes", "GLC 300", T)?.id).toBe(5);
    expect(matchModel("MERCEDES-BENZ", "glc", T)?.id).toBe(5);
  });
  it("не путает похожие модели", () => {
    expect(matchModel("Tesla", "Model Y", T)?.id).toBe(9);
    expect(matchModel("Toyota", "Camry", T)).toBeNull();
    expect(matchModel("Lexus", "RX", T)).toBeNull();
  });
});
