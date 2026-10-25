// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { AuthPage } from "./Auth";
import { ToastProvider } from "../components/ui/core";
afterEach(cleanup);
describe("honest unauthenticated entry", () => {
  it("explains a missing backend and prevents login submission", () => {
    render(
      <ToastProvider>
        <AuthPage />
      </ToastProvider>,
    );
    expect(screen.getByText("اتصال سرور هنوز تنظیم نشده است")).toBeVisible();
    expect(
      screen.getByRole("button", { name: /ورود به سامانه/ }),
    ).toBeDisabled();
  });
  it("lets the user inspect the password without retaining it elsewhere", () => {
    render(
      <ToastProvider>
        <AuthPage />
      </ToastProvider>,
    );
    const password = screen.getByLabelText("رمز عبور");
    expect(password).toHaveAttribute("type", "password");
    fireEvent.click(screen.getByRole("button", { name: "نمایش رمز" }));
    expect(password).toHaveAttribute("type", "text");
  });
  it("shows username recovery and an explanation of private accounts", () => {
    render(
      <ToastProvider>
        <AuthPage />
      </ToastProvider>,
    );
    fireEvent.click(screen.getByText("رمز عبور را فراموش کرده‌اید؟"));
    expect(
      screen.getByRole("heading", { name: "بازیابی دسترسی" }),
    ).toBeVisible();
    expect(screen.queryByLabelText("رمز عبور")).toBeNull();
    expect(screen.getByText(/ثبت‌نام عمومی بسته است/)).toBeVisible();
  });
});
