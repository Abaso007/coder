import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithAuth } from "testHelpers/renderHelpers";
import {
	PaginationWidgetBase,
	type PaginationWidgetBaseProps,
} from "./PaginationWidgetBase";

type SampleProps = Omit<PaginationWidgetBaseProps, "onPageChange">;

describe(PaginationWidgetBase.name, () => {
	it("Should have its previous button be disabled while on page 1", async () => {
		const sampleProps: SampleProps[] = [
			{ currentPage: 1, pageSize: 5, totalRecords: 6 },
			{ currentPage: 1, pageSize: 50, totalRecords: 200 },
			{ currentPage: 1, pageSize: 20, totalRecords: 3000 },
		];

		for (const props of sampleProps) {
			const onPageChange = jest.fn();
			const { unmount } = renderWithAuth(
				<PaginationWidgetBase {...props} onPageChange={onPageChange} />,
			);

			const prevButton = await screen.findByLabelText("Previous page");
			expect(prevButton).toBeDisabled();

			await userEvent.click(prevButton);
			expect(onPageChange).not.toHaveBeenCalled();
			unmount();
		}
	});

	it("Should have its next button be disabled while on last page", async () => {
		const sampleProps: SampleProps[] = [
			{ currentPage: 2, pageSize: 5, totalRecords: 6 },
			{ currentPage: 4, pageSize: 50, totalRecords: 200 },
			{ currentPage: 10, pageSize: 100, totalRecords: 1000 },
		];

		for (const props of sampleProps) {
			const onPageChange = jest.fn();
			const { unmount } = renderWithAuth(
				<PaginationWidgetBase {...props} onPageChange={onPageChange} />,
			);

			const button = await screen.findByLabelText("Next page");
			expect(button).toBeDisabled();

			await userEvent.click(button);
			expect(onPageChange).not.toHaveBeenCalled();
			unmount();
		}
	});

	it("Should have neither button be disabled for all other pages", async () => {
		const sampleProps: SampleProps[] = [
			{ currentPage: 11, pageSize: 5, totalRecords: 60 },
			{ currentPage: 2, pageSize: 50, totalRecords: 200 },
			{ currentPage: 3, pageSize: 20, totalRecords: 100 },
		];

		for (const props of sampleProps) {
			const onPageChange = jest.fn();
			const { unmount } = renderWithAuth(
				<PaginationWidgetBase {...props} onPageChange={onPageChange} />,
			);

			const prevButton = await screen.findByLabelText("Previous page");
			const nextButton = await screen.findByLabelText("Next page");

			expect(prevButton).not.toBeDisabled();

			await userEvent.click(prevButton);
			expect(onPageChange).toHaveBeenCalledTimes(1);

			expect(nextButton).not.toBeDisabled();

			await userEvent.click(nextButton);
			expect(onPageChange).toHaveBeenCalledTimes(2);

			unmount();
		}
	});
});
