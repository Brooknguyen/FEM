export function renderInnovateReport(date) {


  const displayDate = date || "Tất cả";
  return `

    <table class="table-report">
      <thead>
        <tr>
          <th>STT</th>
          <th>Ý tưởng</th>
          <th>Ngày </th>
          <th>Người đề xuất</th>
          <th>Trạng thái</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>1</td>
          <td>Tiết kiệm năng lượng AHU</td>
          <td>Trần Văn B</td>
          <td>Đang xét duyệt</td>
        </tr>
      </tbody>
    </table>`;
}
