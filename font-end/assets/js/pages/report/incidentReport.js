export function renderIncidentReport(date) {
  const displayDate = date || "Tất cả";

  return `
    <h3>Báo cáo cải tiến - Ngày: ${displayDate}</h3>
    <table class="table-report">
      <thead>
        <tr>
          <th>STT</th>
          <th>Sự cố</th>
          <th>Ngày xảy ra</th>
          <th>Xử lý</th>
          <th>Kết quả</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>1</td>
          <td>Mất điện khu B</td>
          <td>${displayDate}</td>
          <td>Reset hệ thống</td>
          <td>Ổn định</td>
        </tr>
      </tbody>
    </table>`;
}
