from app.main import app


def test_openapi_documents_all_55_application_operations():
    schema = app.openapi()
    documented = {
        (method.upper(), path)
        for path, path_item in schema["paths"].items()
        for method in path_item
        if method in {"get", "post", "put", "patch", "delete", "options", "head", "trace"}
    }

    assert len(documented) == 55
    assert {
        ("GET", "/orders/{order_id}"),
        ("GET", "/products/{product_id}/recommendations"),
        ("GET", "/products/{product_id}/images"),
        ("POST", "/payment/webhook"),
    } <= documented


def test_openapi_documents_common_auth_and_rate_limit_errors():
    paths = app.openapi()["paths"]

    assert "401" in paths["/auth/me"]["get"]["responses"]
    assert {"401", "403"} <= paths["/admin/products"]["post"]["responses"].keys()
    assert "429" in paths["/auth/login"]["post"]["responses"]
    assert "401" not in paths["/products"]["get"]["responses"]
