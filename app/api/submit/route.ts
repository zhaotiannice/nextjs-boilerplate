import { NextResponse } from "next/server";

export async function POST(request) {
  try {
    // 解析请求体中的 JSON 数据
    const body = await request.json();
    const { name, email, message } = body;
    console.log("body", body);

    // 返回成功响应
    return NextResponse.json({
      success: true,
      message: "数据提交成功",
      receivedData: { name, email, message },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("处理请求时出错:", error);
    return NextResponse.json({ error: "服务器内部错误" }, { status: 500 });
  }
}
